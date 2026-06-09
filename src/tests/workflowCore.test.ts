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

  it('throws when confirming a stale previous stage after current stage advances', () => {
    const state = confirmWorkflowStage(createInitialWorkflowState(), 'intake', '2026-06-09T00:00:00.000Z');

    expect(() => confirmWorkflowStage(state, 'intake', '2026-06-09T01:00:00.000Z')).toThrow(
      'Cannot confirm stage intake while current stage is world_outline'
    );
  });

  it('throws when confirming the current stage with an invalid status', () => {
    const state = createInitialWorkflowState();

    expect(() =>
      confirmWorkflowStage(
        {
          ...state,
          stages: {
            ...state.stages,
            intake: { status: 'confirmed', confirmedAt: '2026-06-09T00:00:00.000Z' }
          }
        },
        'intake',
        '2026-06-09T01:00:00.000Z'
      )
    ).toThrow('Cannot confirm stage intake with status confirmed');
  });

  it('does not downgrade an already confirmed next stage when unlocking', () => {
    const state = createInitialWorkflowState();
    const next = confirmWorkflowStage(
      {
        ...state,
        stages: {
          ...state.stages,
          world_outline: { status: 'confirmed', confirmedAt: '2026-06-09T00:30:00.000Z' }
        }
      },
      'intake',
      '2026-06-09T01:00:00.000Z'
    );

    expect(next.stages.world_outline.status).toBe('confirmed');
    expect(next.stages.world_outline.confirmedAt).toBe('2026-06-09T00:30:00.000Z');
  });

  it('marks a confirmed stage as regenerating without touching other stages', () => {
    const state = confirmWorkflowStage(createInitialWorkflowState(), 'intake', '2026-06-09T00:00:00.000Z');
    const next = requestStageRegeneration(state, 'intake', '2026-06-09T01:00:00.000Z');

    expect(next.stages.intake.status).toBe('regenerating');
    expect(next.stages.intake.regeneratedAt).toBe('2026-06-09T01:00:00.000Z');
    expect(next.stages.world_outline.status).toBe('draft');
  });

  it('throws when regenerating a locked stage', () => {
    const state = createInitialWorkflowState();

    expect(() => requestStageRegeneration(state, 'world_outline', '2026-06-09T01:00:00.000Z')).toThrow(
      'Cannot regenerate stage world_outline with status locked'
    );
  });

  it('throws when regenerating an optional stage', () => {
    const state = createInitialWorkflowState();

    expect(() => requestStageRegeneration(state, 'full_review', '2026-06-09T01:00:00.000Z')).toThrow(
      'Cannot regenerate stage full_review with status optional'
    );
  });

  it('finds the next required stage', () => {
    expect(findNextWorkflowStage('intake')).toBe('world_outline');
    expect(findNextWorkflowStage('act_scoring')).toBe(null);
  });
});
