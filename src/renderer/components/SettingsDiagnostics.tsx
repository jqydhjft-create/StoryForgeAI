import { BenchmarkAudit, type BenchmarkAuditProps } from './BenchmarkAudit';
import { ProviderSettings, type ProviderSettingsProps } from './ProviderSettings';
import { WorkflowLogs } from './WorkflowLogs';
import type { Language } from '../i18n.js';
import { t } from '../i18n.js';

export interface SettingsDiagnosticsProps extends ProviderSettingsProps, Partial<Omit<BenchmarkAuditProps, 'aiStatus'>> {
  language?: Language;
  workflowLog: string[];
  onBack: () => void;
  showBenchmark?: boolean;
}

export function SettingsDiagnostics({
  language = 'en',
  aiStatus,
  aiConnectionResult,
  aiConfigDraft,
  isAiTesting,
  isAiConfigApplying,
  onAiConfigDraftChange,
  onApiKeyChange,
  onApplyAiConfig,
  onTestAiConnection,
  onClearApiKey,
  workflowLog,
  isBenchmarkRunning,
  benchmarkStatus,
  benchmarkRetryPath,
  onRunRealBenchmark,
  onRetryFailedBenchmark,
  onBenchmarkRetryPathChange,
  onBack,
  showBenchmark = true
}: SettingsDiagnosticsProps) {
  return (
    <main className="settings-diagnostics" aria-label={t(language, 'diagnostics.title')}>
      <header>
        <button type="button" onClick={onBack}>{t(language, 'workspace.back')}</button>
        <h1>{t(language, 'diagnostics.title')}</h1>
        <p>{t(language, 'diagnostics.description')}</p>
      </header>
      <ProviderSettings
        language={language}
        heading={t(language, 'diagnostics.provider')}
        aiStatus={aiStatus}
        aiConnectionResult={aiConnectionResult}
        aiConfigDraft={aiConfigDraft}
        isAiTesting={isAiTesting}
        isAiConfigApplying={isAiConfigApplying}
        onAiConfigDraftChange={onAiConfigDraftChange}
        onApiKeyChange={onApiKeyChange}
        onApplyAiConfig={onApplyAiConfig}
        onTestAiConnection={onTestAiConnection}
        onClearApiKey={onClearApiKey}
        clearApiKeyLabel={t(language, 'settings.clearApiKey')}
      />
      <WorkflowLogs workflowLog={workflowLog} />
      {showBenchmark && isBenchmarkRunning !== undefined && benchmarkStatus !== undefined && benchmarkRetryPath !== undefined && onRunRealBenchmark && onRetryFailedBenchmark && onBenchmarkRetryPathChange ? (
        <BenchmarkAudit
          heading={t(language, 'diagnostics.benchmark')}
          aiStatus={aiStatus}
          isBenchmarkRunning={isBenchmarkRunning}
          benchmarkStatus={benchmarkStatus}
          benchmarkRetryPath={benchmarkRetryPath}
          onRunRealBenchmark={onRunRealBenchmark}
          onRetryFailedBenchmark={onRetryFailedBenchmark}
          onBenchmarkRetryPathChange={onBenchmarkRetryPathChange}
        />
      ) : null}
    </main>
  );
}
