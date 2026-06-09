import type { StoryWorkflowState, WorkflowStageId } from '../../shared/types.js';

const orderedRequiredStages: WorkflowStageId[] = [
  'intake',
  'world_outline',
  'act_timeline',
  'scene_outline',
  'chapter_draft',
  'act_scoring'
];

export function findNextWorkflowStage(stage: WorkflowStageId): WorkflowStageId | null {
  const index = orderedRequiredStages.indexOf(stage);
  if (index < 0) return null;
  return orderedRequiredStages[index + 1] ?? null;
}

export function createInitialWorkflowState(): StoryWorkflowState {
  return {
    currentStage: 'intake',
    stages: {
      intake: { status: 'draft' },
      world_outline: { status: 'locked' },
      act_timeline: { status: 'locked' },
      scene_outline: { status: 'locked' },
      chapter_draft: { status: 'locked' },
      act_scoring: { status: 'locked' },
      full_review: { status: 'optional' }
    },
    artifacts: {},
    memory: {
      characterStates: [],
      foreshadowing: [],
      recentEvents: [],
      workingMemory: []
    }
  };
}

export function confirmWorkflowStage(
  state: StoryWorkflowState,
  stage: WorkflowStageId,
  confirmedAt = new Date().toISOString()
): StoryWorkflowState {
  if (stage !== state.currentStage) {
    throw new Error(`Cannot confirm stage ${stage} while current stage is ${state.currentStage}`);
  }

  const status = state.stages[stage].status;
  if (status !== 'draft' && status !== 'regenerating') {
    throw new Error(`Cannot confirm stage ${stage} with status ${status}`);
  }

  const nextStage = findNextWorkflowStage(stage);
  const stages: StoryWorkflowState['stages'] = {
    ...state.stages,
    [stage]: { ...state.stages[stage], status: 'confirmed', confirmedAt }
  };

  if (nextStage && state.stages[nextStage].status === 'locked') {
    stages[nextStage] = { ...state.stages[nextStage], status: 'draft' };
  }

  return {
    ...state,
    currentStage: nextStage ?? stage,
    stages
  };
}

export function requestStageRegeneration(
  state: StoryWorkflowState,
  stage: WorkflowStageId,
  regeneratedAt = new Date().toISOString()
): StoryWorkflowState {
  const status = state.stages[stage].status;
  if (status === 'locked' || status === 'optional') {
    throw new Error(`Cannot regenerate stage ${stage} with status ${status}`);
  }

  return {
    ...state,
    currentStage: stage,
    stages: {
      ...state.stages,
      [stage]: { ...state.stages[stage], status: 'regenerating', regeneratedAt }
    }
  };
}
