import type { AiProviderStatus } from '../../shared/types.js';
import { redactDiagnosticText } from './diagnosticsRedaction';

export interface BenchmarkAuditProps {
  heading?: string;
  aiStatus: AiProviderStatus;
  isBenchmarkRunning: boolean;
  benchmarkStatus: string;
  benchmarkRetryPath: string;
  onRunRealBenchmark: () => void;
  onRetryFailedBenchmark: () => void;
  onBenchmarkRetryPathChange: (path: string) => void;
}

export function BenchmarkAudit({
  heading = 'Workflow A/B benchmark audit',
  aiStatus,
  isBenchmarkRunning,
  benchmarkStatus,
  benchmarkRetryPath,
  onRunRealBenchmark,
  onRetryFailedBenchmark,
  onBenchmarkRetryPathChange
}: BenchmarkAuditProps) {
  const canRun = aiStatus.configured && aiStatus.provider === 'deepseek' && aiStatus.model === 'deepseek-v4-pro';

  return (
    <section className="settings-diagnostics-section benchmark-audit" aria-labelledby="benchmark-audit-heading">
      <h2 id="benchmark-audit-heading">{heading}</h2>
      <p>Runs 12 cases through both workflows and stores raw artifacts plus anonymous blind-review packets locally.</p>
      <div className="benchmark-audit-actions">
        <button
          type="button"
          className="secondary"
          data-action="run-real-benchmark"
          onClick={onRunRealBenchmark}
          disabled={isBenchmarkRunning || !canRun}
        >
          {isBenchmarkRunning ? 'Running real A/B benchmark…' : 'Run real A/B benchmark'}
        </button>
        <label>
          Benchmark run folder
          <input
            aria-label="Benchmark run folder"
            data-field="benchmark-output-path"
            value={benchmarkRetryPath}
            onChange={(event) => onBenchmarkRetryPathChange(event.target.value)}
            disabled={isBenchmarkRunning}
          />
        </label>
        <button
          type="button"
          className="secondary"
          data-action="retry-failed-benchmark"
          onClick={onRetryFailedBenchmark}
          disabled={isBenchmarkRunning || !canRun}
        >
          Retry failed real A/B cases
        </button>
      </div>
      {benchmarkStatus ? <p role="status">{redactDiagnosticText(benchmarkStatus)}</p> : null}
    </section>
  );
}
