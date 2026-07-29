import { ProviderSettings, type ProviderSettingsProps } from './ProviderSettings';
import { WorkflowLogs } from './WorkflowLogs';
import type { Language } from '../i18n.js';
import { t } from '../i18n.js';

export interface SettingsDiagnosticsProps extends ProviderSettingsProps {
  language?: Language;
  workflowLog: string[];
  onBack: () => void;
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
  onBack
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
    </main>
  );
}
