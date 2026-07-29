import { describe, expect, it } from 'vitest';
import { createInitialWorkflowState } from '../shared/workflowDefaults';
import type { StoryProject } from '../shared/types';
import { buildWorkflowStageInput } from '../renderer/services/workflowStageInput';

function project(): StoryProject {
  return {
    rootPath: '',
    settings: { name: 'Project Name', createdAt: '2026-06-09T00:00:00.000Z', reviewStrictness: 'medium' },
    world: { genre: '', premise: '', rules: [], terms: {} },
    characters: [],
    plot: [],
    chapters: [],
    summary: { timeline: [], locations: [], characters: [] },
    workflow: createInitialWorkflowState()
  };
}

describe('workflowStageInput', () => {
  it('uses the answered story idea for intake instead of only the project name', () => {
    expect(buildWorkflowStageInput('intake', project(), 'A detective interviews a city.')).toEqual({
      idea: 'A detective interviews a city.',
      projectName: 'Project Name'
    });
  });

  it('builds character generation input from confirmed intake and world artifacts', () => {
    const source = project();
    source.workflow.artifacts.initialSettingBook = {
      genre: 'Mystery', worldPremise: 'Memory ledgers.', protagonist: 'Mira', coreConflict: 'Truth versus safety',
      readerFeeling: 'Uneasy wonder', targetLength: '80k', requiredElements: []
    };
    source.workflow.artifacts.worldOutline = { worldDocument: 'World', masterOutline: 'Outline' };

    expect(buildWorkflowStageInput('character_bible', source)).toEqual({
      initialSettingBook: source.workflow.artifacts.initialSettingBook,
      worldOutline: source.workflow.artifacts.worldOutline,
      projectName: 'Project Name'
    });
  });

  it('passes confirmed characters into timeline and scene generation', () => {
    const source = project();
    source.workflow.artifacts.characterBible = [
      { id: 'mira', name: 'Mira', role: 'Archivist', motivation: 'Recover the ledger', flaw: 'Distrusts allies', arc: 'Learns trust' }
    ];

    expect(buildWorkflowStageInput('act_timeline', source)).toMatchObject({ characters: source.workflow.artifacts.characterBible });
    expect(buildWorkflowStageInput('scene_outline', source)).toMatchObject({ characters: source.workflow.artifacts.characterBible });
  });
});
