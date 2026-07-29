import { describe, expect, it } from 'vitest';
import type { StoryProject } from '../shared/types';
import type { StoryPlugin } from '../renderer/services/plugins/storyPluginTypes';
import { createPluginRegistry } from '../renderer/services/plugins/storyPluginTypes';
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

    const result = await generateWorkflowChapterDraft(createPluginRegistry([plugin]), project(), 'act-1', 2);

    expect(result.contextPacket.chapterId).toBe(2);
    expect(result.contextPacket.recentChapterTexts.map((chapter) => chapter.id)).toEqual([1]);
    expect(result.review.status).toBe('issues_found');
    expect(result.saveDecision).toBe('blocked_by_review');
  });

  it('requires second confirmation for force-save', () => {
    expect(forceSaveWorkflowChapterDraft({ secondConfirmation: false }).allowed).toBe(false);
    expect(forceSaveWorkflowChapterDraft({ secondConfirmation: true }).allowed).toBe(true);
  });

  it('rejects a draft whose chapter ID differs from the selected outline chapter', async () => {
    const source = project();
    source.workflow.artifacts.sceneOutline!.acts[0]!.chapters[0]!.chapterId = 1;
    const plugin: StoryPlugin = {
      id: 'test',
      capabilities: {
        write_chapter: async () => ({
          chapter: {
            meta: { id: 2, title: 'Two', sceneCount: 1, characters: ['Mira'], locations: ['Archive'], timelineDay: 2 },
            content: '# Two\n\nDraft.'
          }
        }),
        review_chapter: async () => ({ status: 'passed', summary: 'Clean.', issues: [] })
      }
    };

    await expect(generateWorkflowChapterDraft(createPluginRegistry([plugin]), source, 'act-1', 1)).rejects.toThrow(
      'write_chapter returned chapter 2, expected 1'
    );
  });

  it('rejects a scene outline whose act id differs from the timeline id', async () => {
    const legacyProject = project();
    legacyProject.workflow.artifacts.actTimeline = {
      acts: [
        {
          id: 'opening',
          title: 'Opening',
          time: 'Day 1',
          location: 'Archive',
          characters: ['Mira'],
          movement: 'Find ledger',
          summary: 'Mira finds the ledger.'
        }
      ]
    };
    legacyProject.workflow.artifacts.sceneOutline = {
      acts: [
        {
          actId: 'act-legacy',
          summary: 'Legacy scene outline.',
          chapters: [
            {
              id: 'c2',
              actId: 'act-legacy',
              chapterId: 2,
              target: 'Open the ledger.',
              scenes: [],
              anchors: []
            }
          ]
        }
      ]
    };
    const plugin: StoryPlugin = {
      id: 'test',
      capabilities: {
        write_chapter: async () => ({
          chapter: {
            meta: { id: 2, title: 'Two', sceneCount: 1, characters: ['Mira'], locations: ['Archive'], timelineDay: 2 },
            content: '# Two\n\nDraft.'
          }
        }),
        review_chapter: async () => ({ status: 'passed', summary: 'Clean.', issues: [] })
      }
    };

    await expect(generateWorkflowChapterDraft(createPluginRegistry([plugin]), legacyProject, 'act-legacy', 2)).rejects.toThrow(
      'Workflow act timeline does not contain act act-legacy'
    );
  });
});
