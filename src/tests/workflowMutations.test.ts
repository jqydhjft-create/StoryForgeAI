import { describe, expect, it } from 'vitest';
import type { StoryProject } from '../shared/types';
import { createInitialWorkflowState } from '../renderer/services/workflowCore';
import { confirmWorkflowArtifact, requestWorkflowRegeneration } from '../renderer/services/workflowMutations';

function project(): StoryProject {
  return {
    rootPath: 'D:/Story',
    settings: { name: 'Story', createdAt: '2026-06-09T00:00:00.000Z', reviewStrictness: 'medium' },
    world: { genre: '', premise: '', rules: [], terms: {} },
    characters: [],
    plot: [],
    chapters: [],
    summary: { timeline: [], locations: [], characters: [] },
    workflow: createInitialWorkflowState()
  };
}

describe('workflowMutations', () => {
  it('saves a confirmed intake artifact and unlocks world outline', () => {
    const result = confirmWorkflowArtifact(
      project(),
      'intake',
      {
        genre: 'Mystery',
        worldPremise: 'Memory ledgers.',
        protagonist: 'Mira',
        coreConflict: 'Truth versus safety',
        readerFeeling: 'Uneasy wonder',
        targetLength: '80k',
        requiredElements: []
      },
      '2026-06-09T00:00:00.000Z'
    );

    expect(result.project.workflow.currentStage).toBe('world_outline');
    expect(result.project.workflow.artifacts.initialSettingBook?.genre).toBe('Mystery');
    expect(result.files.map((file) => file.relativePath)).toEqual(['workflow/state.json']);
  });

  it('locks downstream stages when an upstream confirmed artifact is regenerated', () => {
    const first = confirmWorkflowArtifact(
      project(),
      'intake',
      {
        genre: 'Mystery',
        worldPremise: 'Memory ledgers.',
        protagonist: 'Mira',
        coreConflict: 'Truth versus safety',
        readerFeeling: 'Uneasy wonder',
        targetLength: '80k',
        requiredElements: []
      },
      '2026-06-09T00:00:00.000Z'
    );

    const result = requestWorkflowRegeneration(first.project, 'intake', '2026-06-09T01:00:00.000Z');

    expect(result.project.workflow.stages.intake.status).toBe('regenerating');
    expect(result.project.workflow.stages.world_outline.status).toBe('locked');
    expect(result.files[0].relativePath).toBe('workflow/state.json');
  });
});
