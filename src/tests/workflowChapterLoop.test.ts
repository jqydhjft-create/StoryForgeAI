import { describe, expect, it } from 'vitest';
import type { StoryProject } from '../shared/types';
import type { StoryPlugin } from '../renderer/services/plugins/storyPluginTypes';
import { createStoryPluginRegistry } from '../renderer/services/plugins/storyPluginRegistry';
import { createInitialWorkflowState } from '../renderer/services/workflowCore';
import { forceSaveWorkflowChapterDraft, generateWorkflowChapterDraft } from '../renderer/services/workflowChapterLoop';

function project(): StoryProject {
  return {
    rootPath: '',
    settings: { name: 'Story', createdAt: '2026-06-09T00:00:00.000Z', reviewStrictness: 'medium' },
    world: { genre: '', premise: '', rules: [], terms: {} },
    characters: [],
    plot: [],
    chapters: [
      {
        meta: { id: 1, title: 'One', sceneCount: 1, characters: ['Mira'], locations: ['Archive'], timelineDay: 1 },
        content: '# One\n\nText.'
      }
    ],
    summary: { timeline: [], locations: [], characters: [] },
    workflow: {
      ...createInitialWorkflowState(),
      artifacts: {
        actTimeline: {
          acts: [
            {
              id: 'act-1',
              title: 'Act 1',
              time: 'Day 1',
              location: 'Archive',
              characters: ['Mira'],
              movement: 'Find ledger',
              summary: 'Mira finds the ledger.'
            }
          ]
        },
        sceneOutline: {
          acts: [
            {
              actId: 'act-1',
              summary: 'Mira finds the ledger.',
              chapters: [
                {
                  id: 'c2',
                  actId: 'act-1',
                  chapterId: 2,
                  target: 'Open the ledger.',
                  scenes: [],
                  anchors: []
                }
              ]
            }
          ]
        }
      },
      memory: { characterStates: [], foreshadowing: [], recentEvents: [], workingMemory: [] }
    }
  };
}

describe('workflowChapterLoop', () => {
  it('builds strict context, writes a draft, and blocks save on review issues', async () => {
    const plugin: StoryPlugin = {
      id: 'test',
      capabilities: {
        write_chapter: async () => ({
          chapter: {
            meta: { id: 2, title: 'Two', sceneCount: 1, characters: ['Mira'], locations: ['Archive'], timelineDay: 2 },
            content: '# Two\n\nDraft.'
          }
        }),
        review_chapter: async () => ({
          status: 'issues_found',
          summary: 'One issue.',
          issues: [{ id: 'i1', severity: 'warning', message: 'Check ledger location.' }]
        })
      }
    };

    const result = await generateWorkflowChapterDraft(createStoryPluginRegistry([plugin]), project(), 'act-1', 2);

    expect(result.contextPacket.recentChapterTexts.map((chapter) => chapter.id)).toEqual([1]);
    expect(result.review.status).toBe('issues_found');
    expect(result.saveDecision).toBe('blocked_by_review');
  });

  it('requires second confirmation for force-save', () => {
    expect(forceSaveWorkflowChapterDraft({ secondConfirmation: false }).allowed).toBe(false);
    expect(forceSaveWorkflowChapterDraft({ secondConfirmation: true }).allowed).toBe(true);
  });
});
