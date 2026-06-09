import { describe, expect, it } from 'vitest';
import type { StoryPlugin } from '../renderer/services/plugins/storyPluginTypes';
import { createStoryPluginRegistry } from '../renderer/services/plugins/storyPluginRegistry';
import { generateStageArtifact } from '../renderer/services/workflowStageActions';

describe('workflowStageActions', () => {
  it('generates and validates intake artifact through plugins', async () => {
    const plugin: StoryPlugin = {
      id: 'test',
      capabilities: {
        generate_initial_brief: async () => ({
          genre: 'Mystery',
          worldPremise: 'Memory ledgers.',
          protagonist: 'Mira',
          coreConflict: 'Truth versus safety',
          readerFeeling: 'Uneasy wonder',
          targetLength: '80k',
          requiredElements: []
        })
      }
    };

    const artifact = await generateStageArtifact(createStoryPluginRegistry([plugin]), 'intake', { idea: 'Memory ledgers.' });

    expect(artifact.genre).toBe('Mystery');
  });

  it('throws clear errors for locked or unsupported stage actions', async () => {
    await expect(generateStageArtifact(createStoryPluginRegistry([]), 'intake', {})).rejects.toThrow(
      'No story plugin registered for generate_initial_brief'
    );
    await expect(generateStageArtifact(createStoryPluginRegistry([]), 'chapter_draft', {})).rejects.toThrow(
      'Chapter draft uses workflowChapterLoop'
    );
  });

  it('maps every non-chapter workflow stage to a validated plugin capability', async () => {
    const calls: string[] = [];
    const plugin: StoryPlugin = {
      id: 'test',
      capabilities: {
        generate_initial_brief: async () => {
          calls.push('generate_initial_brief');
          return {
            genre: 'Mystery',
            worldPremise: 'Memory ledgers.',
            protagonist: 'Mira',
            coreConflict: 'Truth versus safety',
            readerFeeling: 'Uneasy wonder',
            targetLength: '80k',
            requiredElements: []
          };
        },
        generate_world_and_outline: async () => {
          calls.push('generate_world_and_outline');
          return { worldDocument: 'World', masterOutline: 'Outline' };
        },
        generate_act_timeline: async () => {
          calls.push('generate_act_timeline');
          return {
            acts: [
              {
                id: 'act-1',
                title: 'Opening',
                time: 'Day 1',
                location: 'Archive',
                characters: ['Mira'],
                movement: 'Find ledger',
                summary: 'Mira finds the ledger.'
              }
            ]
          };
        },
        generate_scene_outline: async () => {
          calls.push('generate_scene_outline');
          return { acts: [{ actId: 'act-1', summary: 'Opening act', chapters: [] }] };
        },
        score_act: async () => {
          calls.push('score_act');
          return {
            actId: 'act-1',
            plotContinuity: 8,
            characterConsistency: 7,
            pacingControl: 6,
            detailRichness: 8,
            comment: 'Solid.'
          };
        },
        review_full_text: async () => {
          calls.push('review_full_text');
          return { status: 'passed', summary: 'Clean.', issues: [] };
        }
      }
    };
    const registry = createStoryPluginRegistry([plugin]);

    await generateStageArtifact(registry, 'intake', {});
    await generateStageArtifact(registry, 'world_outline', {});
    await generateStageArtifact(registry, 'act_timeline', {});
    await generateStageArtifact(registry, 'scene_outline', {});
    await generateStageArtifact(registry, 'act_scoring', {});
    await generateStageArtifact(registry, 'full_review', {});

    expect(calls).toEqual([
      'generate_initial_brief',
      'generate_world_and_outline',
      'generate_act_timeline',
      'generate_scene_outline',
      'score_act',
      'review_full_text'
    ]);
  });
});
