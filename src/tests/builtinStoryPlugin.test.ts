import { describe, expect, it } from 'vitest';
import type { StorySkillRequest, StorySkillResponse } from '../shared/types';
import { createBuiltinStoryPlugin } from '../renderer/services/plugins/builtinStoryPlugin';

describe('builtinStoryPlugin', () => {
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
    expect(result).toEqual({ status: 'passed', summary: 'No continuity issue.' });
  });
});
