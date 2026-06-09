import { describe, expect, it } from 'vitest';
import { buildSummary, runSummaryWorkflow, upsertChapterSummary } from '../renderer/services/summaryService';
import type { StorySkillRequest, StorySkillResponse } from '../shared/types';

describe('summaryService', () => {
  it('builds timeline, locations, and character appearances from chapters', () => {
    const summary = buildSummary([
      {
        meta: { id: 1, title: 'Chapel', sceneCount: 1, characters: ['Ash', 'Milo'], locations: ['Ruined Chapel'], timelineDay: 1 },
        content: '# Chapel\n\nAsh finds Milo at dawn.'
      }
    ]);

    expect(summary.timeline[0]).toEqual({ event: 'Chapel', time: 'Day 1', chapter: 1 });
    expect(summary.locations[0].name).toBe('Ruined Chapel');
    expect(summary.characters[0].name).toBe('Ash');
  });

  it('uses the summary-ai skill when it returns valid summary data', async () => {
    const calls: StorySkillRequest[] = [];
    const runner = async (request: StorySkillRequest): Promise<StorySkillResponse> => {
      calls.push(request);
      return {
        skillId: request.skillId,
        provider: 'deepseek',
        output: {
          timeline: [{ event: 'AI timeline', time: 'Dawn', chapter: 1 }],
          locations: [{ name: 'AI Chapel', firstAppearance: 'Chapter 1', scenes: ['Opening'] }],
          characters: [{ name: 'Ash', firstChapter: 1, lastChapter: 1, statusChange: 'Guarding Milo' }]
        }
      };
    };

    const result = await runSummaryWorkflow(
      [
        {
          meta: { id: 1, title: 'Chapel', sceneCount: 1, characters: ['Ash'], locations: ['Ruined Chapel'], timelineDay: 1 },
          content: '# Chapel\n\nAsh finds Milo at dawn.'
        }
      ],
      { skillRunner: runner }
    );

    expect(calls.map((call) => call.skillId)).toEqual(['summary-ai']);
    expect(result.summary.timeline[0].event).toBe('AI timeline');
    expect(result.changeLog).toContain('DeepSeek Skill summary-ai 已应用');
  });

  it('falls back to the local summary when summary-ai is unavailable', async () => {
    const result = await runSummaryWorkflow([
      {
        meta: { id: 1, title: 'Chapel', sceneCount: 1, characters: ['Ash'], locations: ['Ruined Chapel'], timelineDay: 1 },
        content: '# Chapel\n\nAsh finds Milo at dawn.'
      }
    ]);

    expect(result.summary.timeline[0]).toEqual({ event: 'Chapel', time: 'Day 1', chapter: 1 });
    expect(result.changeLog).toContain('Skill summary-ai 使用 mock：未配置模型 runner');
  });

  it('sends summary-ai compact chapter previews instead of full chapter text', async () => {
    const longText = `# Long\n\n${'A'.repeat(5000)}`;
    const calls: StorySkillRequest[] = [];
    const runner = async (request: StorySkillRequest): Promise<StorySkillResponse> => {
      calls.push(request);
      return {
        skillId: request.skillId,
        provider: 'deepseek',
        output: {
          timeline: [{ event: 'AI timeline', time: 'Dawn', chapter: 1 }],
          locations: [{ name: 'AI Chapel', firstAppearance: 'Chapter 1', scenes: ['Opening'] }],
          characters: [{ name: 'Ash', firstChapter: 1, lastChapter: 1, statusChange: 'Guarding Milo' }]
        }
      };
    };

    await runSummaryWorkflow(
      [
        {
          meta: { id: 1, title: 'Long', sceneCount: 1, characters: ['Ash'], locations: ['Ruined Chapel'], timelineDay: 1 },
          content: longText
        }
      ],
      { skillRunner: runner }
    );

    const prompt = calls[0].userPrompt;
    const payload = JSON.parse(prompt) as { chapters: Array<{ contentPreview: string }> };

    expect(prompt).not.toContain('A'.repeat(1000));
    expect(payload.chapters[0].contentPreview.length).toBeLessThanOrEqual(500);
  });

  it('updates only the saved chapter summary while preserving previous summary entries', () => {
    const summary = upsertChapterSummary(
      {
        timeline: [
          { event: 'Old chapter 1', time: 'Day 1', chapter: 1 },
          { event: 'Chapter 2 remains', time: 'Day 2', chapter: 2 }
        ],
        locations: [{ name: 'Old Chapel', firstAppearance: 'Chapter 1', scenes: ['Chapter 1'] }],
        characters: [{ name: 'Ash', firstChapter: 1, lastChapter: 2, statusChange: 'Already tracked' }]
      },
      {
        meta: { id: 1, title: 'Rewritten Chapel', sceneCount: 1, characters: ['Milo'], locations: ['New Chapel'], timelineDay: 3 },
        content: '# Rewritten Chapel\n\nMilo finds a new clue.'
      }
    );

    expect(summary.timeline).toEqual([
      { event: 'Rewritten Chapel', time: 'Day 3', chapter: 1 },
      { event: 'Chapter 2 remains', time: 'Day 2', chapter: 2 }
    ]);
    expect(summary.locations.map((location) => location.name)).toEqual(['New Chapel']);
    expect(summary.characters.map((character) => character.name)).toContain('Ash');
    expect(summary.characters.map((character) => character.name)).toContain('Milo');
  });
});
