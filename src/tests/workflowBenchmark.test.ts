import { describe, expect, it } from 'vitest';
import { blindArtifacts, createRealModelEvaluationPlan, decideLegacyDeletion } from '../shared/workflowBenchmark';

describe('workflow benchmark decisions', () => {
  it('keeps deletion pending without real-model scores', () => {
    expect(decideLegacyDeletion({ structuralPassed: true, structuralCaseCount: 12, productionCallGuardPassed: true })).toEqual({
      status: 'pending_real_model_evaluation',
      reasons: ['Real-model evaluation has not been completed']
    });
  });

  it('permits deletion only when every threshold passes', () => {
    expect(decideLegacyDeletion({
      structuralPassed: true,
      structuralCaseCount: 12,
      productionCallGuardPassed: true,
      realModel: { legacyScore: 100, unifiedScore: 90, unifiedFailureRate: 0.05, legacyContradictions: 2, unifiedContradictions: 1 }
    })).toEqual({ status: 'eligible', reasons: [] });
  });

  it('permits deletion when both workflows have zero contradictions', () => {
    expect(decideLegacyDeletion({
      structuralPassed: true,
      structuralCaseCount: 12,
      productionCallGuardPassed: true,
      realModel: { legacyScore: 100, unifiedScore: 100, unifiedFailureRate: 0, legacyContradictions: 0, unifiedContradictions: 0 }
    })).toEqual({ status: 'eligible', reasons: [] });
  });

  it('hides workflow sources behind randomized A/B labels', () => {
    expect(blindArtifacts([{ source: 'legacy', text: 'Legacy' }, { source: 'unified', text: 'Unified' }], () => 0.9)).toEqual([
      { label: 'A', text: 'Unified' },
      { label: 'B', text: 'Legacy' }
    ]);
  });

  it('refuses a real-model run without a configured provider', () => {
    expect(createRealModelEvaluationPlan({ configured: false })).toEqual({ status: 'provider_not_configured' });
  });
});
