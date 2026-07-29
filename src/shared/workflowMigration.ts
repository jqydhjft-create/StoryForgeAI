import type {
  InitialSettingBook,
  StoryProject,
  StoryWorkflowState,
  WorkflowStageId,
  WorldOutlineArtifact
} from './types.js';
import { createInitialWorkflowState } from './workflowDefaults.js';

export interface LegacyWorkflowMigrationResult {
  workflow: StoryWorkflowState;
  migrated: boolean;
  warnings: string[];
}

const requiredStages: WorkflowStageId[] = [
  'intake',
  'world_outline',
  'character_bible',
  'act_timeline',
  'scene_outline',
  'chapter_draft',
  'act_scoring'
];

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function confirmThrough(workflow: StoryWorkflowState, lastConfirmed: WorkflowStageId): StoryWorkflowState {
  const lastIndex = requiredStages.indexOf(lastConfirmed);
  const stages = Object.fromEntries(
    Object.entries(workflow.stages).map(([stage, state]) => [stage, { ...state }])
  ) as StoryWorkflowState['stages'];

  for (let index = 0; index <= lastIndex; index += 1) {
    stages[requiredStages[index]].status = 'confirmed';
  }

  const nextStage = requiredStages[lastIndex + 1];
  if (nextStage) {
    stages[nextStage].status = 'draft';
  }

  return { ...workflow, currentStage: nextStage ?? lastConfirmed, stages };
}

function initialSettingBook(project: StoryProject): InitialSettingBook {
  return {
    genre: project.world.genre || 'Unspecified',
    worldPremise: project.world.premise || project.settings.name,
    protagonist: project.characters[0]?.name || 'Unspecified',
    coreConflict: project.plot[0]?.summary || 'Unspecified',
    readerFeeling: 'Unspecified',
    targetLength: 'Unspecified',
    requiredElements: project.world.rules.filter(hasText)
  };
}

function worldOutline(project: StoryProject): WorldOutlineArtifact {
  return {
    worldDocument: JSON.stringify(project.world, null, 2),
    masterOutline: project.plot.length > 0 ? JSON.stringify(project.plot, null, 2) : ''
  };
}

export function migrateLegacyWorkflow(project: StoryProject, hasValidPersistedWorkflow = false): LegacyWorkflowMigrationResult {
  if (hasValidPersistedWorkflow) {
    return { workflow: project.workflow, migrated: false, warnings: [] };
  }

  const warnings: string[] = [];
  let workflow = createInitialWorkflowState();
  const artifacts: StoryWorkflowState['artifacts'] = {
    initialSettingBook: initialSettingBook(project)
  };

  workflow = confirmThrough({ ...workflow, artifacts }, 'intake');

  if (hasText(project.world.premise)) {
    workflow = confirmThrough({ ...workflow, artifacts: { ...workflow.artifacts, worldOutline: worldOutline(project) } }, 'world_outline');
  } else {
    return { workflow, migrated: true, warnings };
  }

  if (project.characters.length === 0) {
    if (project.plot.length > 0) warnings.push('Legacy plot requires act timeline regeneration');
    return { workflow, migrated: true, warnings };
  }

  workflow = confirmThrough(
    { ...workflow, artifacts: { ...workflow.artifacts, characterBible: structuredClone(project.characters) } },
    'character_bible'
  );

  if (project.plot.length > 0) warnings.push('Legacy plot requires act timeline regeneration');
  return { workflow, migrated: true, warnings };
}
