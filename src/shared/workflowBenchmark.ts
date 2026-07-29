export type LegacyDeletionStatus = 'pending_structural' | 'pending_real_model_evaluation' | 'blocked' | 'eligible';

export interface RealModelBenchmarkResult {
  legacyScore: number;
  unifiedScore: number;
  unifiedFailureRate: number;
  legacyContradictions: number;
  unifiedContradictions: number;
}

export interface BenchmarkDecisionInput {
  structuralPassed: boolean;
  structuralCaseCount: number;
  productionCallGuardPassed: boolean;
  realModel?: RealModelBenchmarkResult;
}

export interface LegacyDeletionDecision {
  status: LegacyDeletionStatus;
  reasons: string[];
}

export function decideLegacyDeletion(input: BenchmarkDecisionInput): LegacyDeletionDecision {
  if (!input.structuralPassed || input.structuralCaseCount !== 12 || !input.productionCallGuardPassed) {
    const reasons = [
      ...(!input.structuralPassed || input.structuralCaseCount !== 12 ? ['Structural benchmark did not pass all 12 cases'] : []),
      ...(!input.productionCallGuardPassed ? ['Production-call guard did not pass'] : [])
    ];
    return { status: 'pending_structural', reasons };
  }
  if (!input.realModel) return { status: 'pending_real_model_evaluation', reasons: ['Real-model evaluation has not been completed'] };

  const { legacyScore, unifiedScore, unifiedFailureRate, legacyContradictions, unifiedContradictions } = input.realModel;
  const reasons = [
    ...(unifiedScore < legacyScore * 0.9 ? ['Unified score is below 90% of legacy score'] : []),
    ...(unifiedFailureRate > 0.05 ? ['Unified structure failure rate exceeds 5%'] : []),
    ...(unifiedContradictions > legacyContradictions ? ['Unified contradiction rate exceeds legacy'] : [])
  ];
  return reasons.length > 0 ? { status: 'blocked', reasons } : { status: 'eligible', reasons: [] };
}

export interface SourceArtifact { source: 'legacy' | 'unified'; text: string; }
export interface BlindArtifact { label: 'A' | 'B'; text: string; }

export interface RealBenchmarkCaseArtifacts {
  caseId: string;
  legacy: SourceArtifact;
  unified: SourceArtifact;
}

export interface RealBenchmarkCaseResult {
  id: string;
  status: 'completed' | 'failed';
  error?: string;
}

export interface RealBenchmarkResultsManifest {
  expectedCaseIds: string[];
  results: RealBenchmarkCaseResult[];
}

export function blindArtifacts(artifacts: SourceArtifact[], random: () => number = Math.random): BlindArtifact[] {
  const ordered = random() >= 0.5 ? [...artifacts].reverse() : [...artifacts];
  return ordered.map((artifact, index) => ({ label: index === 0 ? 'A' : 'B', text: artifact.text }));
}

export function createRealModelEvaluationPlan(provider: { configured: boolean }) {
  return provider.configured ? { status: 'ready' as const } : { status: 'provider_not_configured' as const };
}
