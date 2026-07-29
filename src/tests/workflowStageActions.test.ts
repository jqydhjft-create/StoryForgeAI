import { describe, expect, it } from 'vitest';
import type { StoryPlugin } from '../renderer/services/plugins/storyPluginTypes';
import type { StorySkillRequest, StorySkillResponse } from '../shared/types';
import { createSkillStoryPlugin } from '../renderer/services/plugins/skillStoryPlugin';
import { createMockStoryPlugin } from '../renderer/services/plugins/mockStoryPlugin';
import { createPluginRegistry } from '../renderer/services/plugins/storyPluginTypes';
import { generateStageArtifact } from '../renderer/services/workflowStageActions';

describe('workflowStageActions', () => {
  it('generates a validated character bible through plugins', async () => {
    const plugin: StoryPlugin = {
      id: 'test',
      capabilities: {
        generate_characters: async () => [
          {
            id: 'mira',
            name: 'Mira',
            role: 'Archivist',
            motivation: 'Recover the missing ledger',
            flaw: 'Distrusts allies',
            arc: 'Learns to share the truth'
          }
        ]
      }
    };

    const artifact = await generateStageArtifact(createPluginRegistry([plugin]), 'character_bible', {});

    expect(artifact).toEqual([expect.objectContaining({ id: 'mira', name: 'Mira' })]);
  });

  it('rejects an empty or malformed character bible', async () => {
    const plugin: StoryPlugin = {
      id: 'test',
      capabilities: { generate_characters: async () => [{ id: 'mira', name: 'Mira' }] }
    };

    await expect(generateStageArtifact(createPluginRegistry([plugin]), 'character_bible', {})).rejects.toThrow(
      'Invalid character bible'
    );
  });

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

    const artifact = await generateStageArtifact(createPluginRegistry([plugin]), 'intake', { idea: 'Memory ledgers.' });

    expect(artifact.genre).toBe('Mystery');
  });

  it('throws clear errors for locked or unsupported stage actions', async () => {
    await expect(generateStageArtifact(createPluginRegistry([]), 'intake', {})).rejects.toThrow(
      'No story plugin registered for generate_initial_brief'
    );
    await expect(generateStageArtifact(createPluginRegistry([]), 'chapter_draft', {})).rejects.toThrow(
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
    const registry = createPluginRegistry([plugin]);

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

  it('adapts built-in story skill outputs into validated workflow artifacts', async () => {
    const requestedSkills: StorySkillRequest['skillId'][] = [];
    const runner = async (request: StorySkillRequest): Promise<StorySkillResponse> => {
      requestedSkills.push(request.skillId);
      const outputs = {
        'theme-generator': {
          title: 'Memory Ledgers',
          protagonist: 'Mira',
          goal: 'Find the missing ledger',
          conflict: 'Truth versus safety',
          themes: ['Uneasy wonder', 'Archives remember debts']
        },
        'world-generator': {
          genre: 'Mystery',
          premise: 'Memories are stored in ledgers.',
          rules: ['Ledgers can be edited only at dawn.'],
          terms: { Ledger: 'A memory record.' }
        },
        'plot-designer': {
          plot: [{ id: 'opening', label: 'Opening', summary: 'Mira finds the ledger.', chapterHint: 2 }]
        },
        'character-generator': {
          characters: [
            {
              id: 'mira',
              name: 'Mira',
              role: 'Archivist',
              motivation: 'Recover the missing ledger',
              flaw: 'Distrustful',
              arc: 'Learns to share the truth'
            }
          ]
        },
        'act-timeline-generator': {
          acts: [
            {
              id: 'opening',
              title: 'Opening',
              time: 'Day 1',
              location: 'Archive',
              characters: ['Mira'],
              movement: 'Opening',
              summary: 'Mira finds the ledger in the archive.'
            }
          ]
        },
        'scene-outline-generator': {
          acts: [
            {
              actId: 'opening',
              summary: 'Opening act',
              chapters: [
                {
                  id: 'chapter-1',
                  actId: 'opening',
                  chapterId: 2,
                  target: 'Mira finds the ledger.',
                  scenes: [],
                  anchors: []
                }
              ]
            }
          ]
        },
        'score-act': {
          actId: 'act-1',
          plotContinuity: 8,
          characterConsistency: 7,
          pacingControl: 6,
          detailRichness: 9,
          comment: 'Solid pacing and character work.'
        },
        'integrated-gate': {
          status: 'passed',
          summary: 'Solid.',
          issues: []
        }
      } as const;

      return { skillId: request.skillId, provider: 'mock', output: outputs[request.skillId as keyof typeof outputs] };
    };

    const registry = createPluginRegistry([createSkillStoryPlugin(runner)]);

    expect((await generateStageArtifact(registry, 'intake', { idea: 'Memory ledgers.' })).genre).toBe('Mystery');
    expect((await generateStageArtifact(registry, 'world_outline', {})).masterOutline).toContain('Opening');
    expect((await generateStageArtifact(registry, 'character_bible', {}))[0].name).toBe('Mira');
    const actTimeline = await generateStageArtifact(registry, 'act_timeline', {});
    const sceneOutline = await generateStageArtifact(registry, 'scene_outline', {});

    expect(actTimeline.acts[0].id).toBe('opening');
    expect(actTimeline.acts[0].movement).toBe('Opening');
    expect(actTimeline.acts[0].movement).not.toBe(actTimeline.acts[0].summary);
    expect(sceneOutline.acts[0].chapters[0].target).toContain('Mira');
    expect(sceneOutline.acts[0].actId).toBe(actTimeline.acts[0].id);
    expect(sceneOutline.acts[0].chapters[0].actId).toBe(actTimeline.acts[0].id);
    expect((await generateStageArtifact(registry, 'act_scoring', { actId: 'act-1' })).plotContinuity).toBe(8);
    expect((await generateStageArtifact(registry, 'full_review', {})).status).toBe('passed');
    expect(requestedSkills).toEqual([
      'theme-generator',
      'world-generator',
      'plot-designer',
      'character-generator',
      'act-timeline-generator',
      'scene-outline-generator',
      'score-act',
      'integrated-gate'
    ]);
  });

  it('provides deterministic mock artifacts for the workflow plugin path', async () => {
    const registry = createPluginRegistry([createMockStoryPlugin()]);

    expect((await generateStageArtifact(registry, 'intake', { idea: 'A city writes memories into ledgers.' })).worldPremise).toContain(
      'A city writes memories'
    );
    expect((await generateStageArtifact(registry, 'world_outline', { projectName: 'Ledger City' })).worldDocument).toContain('Ledger City');
    expect((await generateStageArtifact(registry, 'act_timeline', {})).acts.length).toBeGreaterThan(0);
    expect((await generateStageArtifact(registry, 'scene_outline', {})).acts[0].chapters.length).toBeGreaterThan(0);
    expect((await generateStageArtifact(registry, 'act_scoring', { actId: 'act-1' })).actId).toBe('act-1');
    expect((await generateStageArtifact(registry, 'full_review', {})).status).toBe('passed');

    const chapter = await registry.invoke('write_chapter', { chapterId: 2 });
    const review = await registry.invoke('review_chapter', chapter);

    expect(chapter).toMatchObject({ chapter: { meta: { id: 2 } } });
    expect(review).toMatchObject({ status: 'passed' });
  });
});
