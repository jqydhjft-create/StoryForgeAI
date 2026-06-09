import { describe, expect, it } from 'vitest';
import {
  confirmWorkflowStage,
  createInitialWorkflowState,
  findNextWorkflowStage,
  requestStageRegeneration
} from '../renderer/services/workflowCore';

describe('workflowCore', () => {
  it('starts at intake with the remaining required stages locked', () => {
    const state = createInitialWorkflowState();

    expect(state.currentStage).toBe('intake');
    expect(state.stages.intake.status).toBe('draft');
    expect(state.stages.world_outline.status).toBe('locked');
    expect(state.stages.full_review.status).toBe('optional');
  });

  it('confirms a stage and unlocks the next stage', () => {
    const state = createInitialWorkflowState();
    const next = confirmWorkflowStage(state, 'intake', '2026-06-09T00:00:00.000Z');

    expect(next.stages.intake.status).toBe('confirmed');
    expect(next.stages.world_outline.status).toBe('draft');
    expect(next.currentStage).toBe('world_outline');
  });

  it('marks a confirmed stage as regenerating without touching other stages', () => {
    const state = confirmWorkflowStage(createInitialWorkflowState(), 'intake', '2026-06-09T00:00:00.000Z');
    const next = requestStageRegeneration(state, 'intake', '2026-06-09T01:00:00.000Z');

    expect(next.stages.intake.status).toBe('regenerating');
    expect(next.stages.intake.regeneratedAt).toBe('2026-06-09T01:00:00.000Z');
    expect(next.stages.world_outline.status).toBe('draft');
  });

  it('finds the next required stage', () => {
    expect(findNextWorkflowStage('intake')).toBe('world_outline');
    expect(findNextWorkflowStage('act_scoring')).toBe(null);
  });
});
