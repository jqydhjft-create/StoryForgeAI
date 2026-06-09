import { describe, expect, it } from 'vitest';
import type { StorySkillRequest, StorySkillResponse } from '../shared/types';
import { createBuiltinStoryPlugin } from '../renderer/services/plugins/builtinStoryPlugin';

describe('builtinStoryPlugin', () => {
  it('advertises concrete workflow and chapter capabilities', () => {
    const runner = async (request: StorySkillRequest): Promise<StorySkillResponse> => ({
      skillId: request.skillId,
      provider: 'mock',
      output: {}
    });

    const plugin = createBuiltinStoryPlugin(runner);

    expect(Object.keys(plugin.capabilities).sort()).toEqual([
      'generate_act_timeline',
      'generate_initial_brief',
      'generate_scene_outline',
      'generate_world_and_outline',
      'review_chapter',
      'review_full_text',
      'score_act',
      'write_chapter'
    ]);
  });

  it('maps stage generation, scoring, and full review to existing story skills', async () => {
    const calls: StorySkillRequest[] = [];
    const runner = async (request: StorySkillRequest): Promise<StorySkillResponse> => {
      calls.push(request);
      return { skillId: request.skillId, provider: 'mock', output: { status: 'passed', summary: request.skillId } };
    };

    const plugin = createBuiltinStoryPlugin(runner);

    await plugin.capabilities.generate_initial_brief?.({ idea: 'A city of memories.' });
    await plugin.capabilities.generate_world_and_outline?.({ initialSettingBook: {} });
    await plugin.capabilities.generate_act_timeline?.({ worldOutline: {} });
    await plugin.capabilities.generate_scene_outline?.({ actTimeline: {} });
    await plugin.capabilities.score_act?.({ actId: 'act-1' });
    await plugin.capabilities.review_full_text?.({ chapters: [] });

    expect(calls.map((call) => call.skillId)).toEqual([
      'theme-generator',
      'world-generator',
      'plot-designer',
      'plot-designer',
      'plot-designer',
      'integrated-gate',
      'integrated-gate'
    ]);
  });

  it('maps write_chapter to the existing next-chapter workshop skill', async () => {
    const calls: StorySkillRequest[] = [];
    const runner = async (request: StorySkillRequest): Promise<StorySkillResponse> => {
      calls.push(request);
      return {
        skillId: request.skillId,
        provider: 'mock',
        output: {
          chapter: {
            meta: { id: 2, title: 'Chapter 2', sceneCount: 1, characters: ['Mira'], locations: ['Archive'], timelineDay: 2 },
            content: '# Chapter 2\n\nMira reads the ledger.'
          },
          reviewNotes: ['Continues the archive thread.']
        }
      };
    };

    const plugin = createBuiltinStoryPlugin(runner);
    const result = await plugin.capabilities.write_chapter?.({ nextChapterId: 2 });

    expect(calls[0].skillId).toBe('next-chapter-workshop');
    expect(result).toEqual({
      chapter: {
        meta: { id: 2, title: 'Chapter 2', sceneCount: 1, characters: ['Mira'], locations: ['Archive'], timelineDay: 2 },
        content: '# Chapter 2\n\nMira reads the ledger.'
      },
      reviewNotes: ['Continues the archive thread.']
    });
  });

  it('maps review_chapter to the current logic detective skill', async () => {
    const calls: StorySkillRequest[] = [];
    const runner = async (request: StorySkillRequest): Promise<StorySkillResponse> => {
      calls.push(request);
      return {
        skillId: request.skillId,
        provider: 'mock',
        output: { status: 'passed', summary: 'No continuity issue.' }
      };
    };

    const plugin = createBuiltinStoryPlugin(runner);
    const result = await plugin.capabilities.review_chapter?.({ chapterId: 2, content: 'Mira reads.' });

    expect(calls[0].skillId).toBe('logic-detective');
    expect(result).toEqual({ status: 'passed', summary: 'No continuity issue.', issues: [] });
  });

  it('normalizes legacy failed logic detective output to a chapter review report', async () => {
    const runner = async (request: StorySkillRequest): Promise<StorySkillResponse> => ({
      skillId: request.skillId,
      provider: 'mock',
      output: { status: 'failed' }
    });

    const plugin = createBuiltinStoryPlugin(runner);
    const result = await plugin.capabilities.review_chapter?.({ chapterId: 2, content: 'Mira reads.' });

    expect(result).toEqual({
      status: 'issues_found',
      summary: 'Legacy review did not include a summary.',
      issues: [
        {
          id: 'legacy-logic-detective',
          severity: 'error',
          message: 'Legacy review did not include a summary.'
        }
      ]
    });
  });
});
