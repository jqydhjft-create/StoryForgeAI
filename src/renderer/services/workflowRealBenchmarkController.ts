import { workflowBenchmarkCases } from '../../shared/workflowBenchmarkCases.js';
import type { WorkflowBenchmarkRunRequest } from '../../shared/types.js';
import { executeWorkflowBenchmarkCase, type RealBenchmarkCaseArtifacts } from './workflowRealBenchmarkOrchestrator.js';
import type { RealBenchmarkCaseResult as SharedRealBenchmarkCaseResult, RealBenchmarkResultsManifest } from '../../shared/workflowBenchmark.js';

export type RealBenchmarkCaseResult = SharedRealBenchmarkCaseResult;

export function failedBenchmarkCaseIds(manifest: RealBenchmarkResultsManifest): string[] {
  return manifest.expectedCaseIds.filter((id) => manifest.results.some((result) => result.id === id && result.status === 'failed'));
}

export async function runRealBenchmarkBatch(
  request: WorkflowBenchmarkRunRequest,
  validate: (value: WorkflowBenchmarkRunRequest) => Promise<unknown>,
  executeCase: (id: string, idea: string) => Promise<void>,
  cases = workflowBenchmarkCases
): Promise<RealBenchmarkCaseResult[]> {
  await validate(request);
  const results: RealBenchmarkCaseResult[] = [];
  for (const { id, idea } of cases) {
    try {
      await executeCase(id, idea);
      results.push({ id, status: 'completed' });
    } catch (error) {
      results.push({ id, status: 'failed', error: error instanceof Error ? error.message : String(error) });
    }
  }
  return results;
}

export async function retryFailedDesktopRealBenchmarkBatch(
  request: WorkflowBenchmarkRunRequest,
  outputPath: string
): Promise<{ results: RealBenchmarkCaseResult[]; retriedCaseIds: string[]; outputPath: string }> {
  const storyforge = typeof window === 'undefined' ? undefined : window.storyforge;
  if (!storyforge?.readBenchmarkResults || !storyforge.appendBenchmarkArtifacts || !storyforge.validateRealModelBenchmark || !storyforge.runBenchmarkSkill) {
    throw new Error('Desktop benchmark retry IPC is unavailable');
  }
  const manifest = await storyforge.readBenchmarkResults(outputPath);
  const retriedCaseIds = failedBenchmarkCaseIds(manifest);
  const cases = workflowBenchmarkCases.filter((benchmarkCase) => retriedCaseIds.includes(benchmarkCase.id));
  if (cases.length === 0) throw new Error('This benchmark run has no failed cases to retry');
  const artifacts: RealBenchmarkCaseArtifacts[] = [];
  const results = await runRealBenchmarkBatch(request, (value) => storyforge.validateRealModelBenchmark(value), async (id, idea) => {
    artifacts.push(await executeWorkflowBenchmarkCase(request, id, idea, (lockedRequest, skill) => storyforge.runBenchmarkSkill(lockedRequest, skill)));
  }, cases);
  await storyforge.appendBenchmarkArtifacts(outputPath, request, results, artifacts);
  return { results, retriedCaseIds, outputPath };
}

export async function runDesktopRealBenchmarkBatch(request: WorkflowBenchmarkRunRequest): Promise<{
  results: RealBenchmarkCaseResult[];
  artifacts: RealBenchmarkCaseArtifacts[];
}> {
  const storyforge = typeof window === 'undefined' ? undefined : window.storyforge;
  if (!storyforge?.validateRealModelBenchmark || !storyforge.runBenchmarkSkill) {
    throw new Error('Desktop benchmark IPC is unavailable');
  }

  const artifacts: RealBenchmarkCaseArtifacts[] = [];
  const results = await runRealBenchmarkBatch(
    request,
    (value) => storyforge.validateRealModelBenchmark(value),
    async (id, idea) => {
      artifacts.push(await executeWorkflowBenchmarkCase(request, id, idea, (lockedRequest, skill) =>
        storyforge.runBenchmarkSkill(lockedRequest, skill)
      ));
    }
  );
  return { results, artifacts };
}

export async function storeRealBenchmarkBatch(
  request: WorkflowBenchmarkRunRequest,
  batch: { results: RealBenchmarkCaseResult[]; artifacts: RealBenchmarkCaseArtifacts[] },
  writeArtifacts: (
    request: WorkflowBenchmarkRunRequest,
    expectedCaseIds: string[],
    results: RealBenchmarkCaseResult[],
    artifacts: RealBenchmarkCaseArtifacts[]
  ) => Promise<{ outputPath: string }>
): Promise<{ outputPath: string }> {
  return writeArtifacts(request, workflowBenchmarkCases.map((benchmarkCase) => benchmarkCase.id), batch.results, batch.artifacts);
}

export async function runAndStoreDesktopRealBenchmarkBatch(request: WorkflowBenchmarkRunRequest): Promise<{
  results: RealBenchmarkCaseResult[];
  artifacts: RealBenchmarkCaseArtifacts[];
  outputPath: string;
}> {
  const storyforge = typeof window === 'undefined' ? undefined : window.storyforge;
  if (!storyforge?.writeBenchmarkArtifacts) {
    throw new Error('Desktop benchmark artifact storage is unavailable');
  }
  const batch = await runDesktopRealBenchmarkBatch(request);
  const { outputPath } = await storeRealBenchmarkBatch(
    request,
    batch,
    (lockedRequest, expectedCaseIds, results, artifacts) =>
      storyforge.writeBenchmarkArtifacts(lockedRequest, expectedCaseIds, results, artifacts)
  );
  return { ...batch, outputPath };
}
