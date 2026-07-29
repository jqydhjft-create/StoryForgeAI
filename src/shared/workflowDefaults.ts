import type { StoryWorkflowState } from './types.js';

export function createInitialWorkflowState(): StoryWorkflowState {
  return {
    currentStage: 'intake',
    stages: {
      intake: { status: 'draft' },
      world_outline: { status: 'locked' },
      character_bible: { status: 'locked' },
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
