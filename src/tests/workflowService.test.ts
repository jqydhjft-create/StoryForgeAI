import { describe, expect, it } from 'vitest';
import type { StoryPlugin } from '../renderer/services/plugins/storyPluginTypes';
import { createPluginRegistry } from '../renderer/services/plugins/storyPluginTypes';
import { createInitialWorkflowState } from '../renderer/services/workflowCore';
import { createWorkflowService } from '../renderer/services/workflowService';
import type { StoryProject } from '../shared/types';

function project(): StoryProject {
  return {
    rootPath: '',
    settings: { name: 'Ledger City', createdAt: '2026-07-27T00:00:00.000Z', reviewStrictness: 'medium' },
    world: { genre: '', premise: '', rules: [], terms: {} },
    characters: [],
    plot: [],
    chapters: [],
    summary: { timeline: [], locations: [], characters: [] },
    workflow: createInitialWorkflowState()
  };
}

describe('workflowService', () => {
  it('builds intake input and delegates generation to its registry', async () => {
    let received: unknown;
    const plugin: StoryPlugin = {
      id: 'test',
      capabilities: {
        generate_initial_brief: async (input) => {
          received = input;
          return {
            genre: 'Mystery',
            worldPremise: 'Memory ledgers.',
            protagonist: 'Mira',
            coreConflict: 'Truth versus safety',
            readerFeeling: 'Uneasy wonder',
            targetLength: '80k',
            requiredElements: []
          };
        }
      }
    };

    const service = createWorkflowService({ registry: createPluginRegistry([plugin]) });
    const artifact = await service.generateStage(project(), 'intake', 'A city stores memories.');

    expect(received).toEqual({ idea: 'A city stores memories.', projectName: 'Ledger City' });
    expect(artifact).toMatchObject({ genre: 'Mystery' });
  });

  it('rejects an invalid provider artifact without mutating the project', async () => {
    const source = project();
    const plugin: StoryPlugin = {
      id: 'test',
      capabilities: { generate_act_timeline: async () => ({ acts: [] }) }
    };
    const service = createWorkflowService({ registry: createPluginRegistry([plugin]) });

    await expect(service.generateStage(source, 'act_timeline')).rejects.toThrow('Invalid act timeline');
    expect(source.workflow.artifacts.actTimeline).toBeUndefined();
    expect(source.workflow.currentStage).toBe('intake');
  });
});
