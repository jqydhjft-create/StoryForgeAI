import type { AiConnectionTestResult, AiProviderConfigInput, AiProviderStatus } from '../../shared/types.js';
import { redactDiagnosticText } from './diagnosticsRedaction';
import type { Language } from '../i18n.js';
import { t } from '../i18n.js';

export type ProviderConfigFields = AiProviderConfigInput;

export interface ProviderSettingsProps {
  heading?: string;
  language?: Language;
  aiStatus: AiProviderStatus;
  aiConnectionResult: AiConnectionTestResult | null;
  aiConfigDraft: ProviderConfigFields;
  isAiTesting: boolean;
  isAiConfigApplying: boolean;
  onAiConfigDraftChange: (draft: ProviderConfigFields) => void;
  onApiKeyChange: (apiKey: string) => void;
  onApplyAiConfig: () => void;
  onTestAiConnection: () => void;
  onClearApiKey?: () => void;
  clearApiKeyLabel?: string;
}

export function ProviderSettings({
  heading,
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
  clearApiKeyLabel
}: ProviderSettingsProps) {
  const isProviderBusy = isAiTesting || isAiConfigApplying;
  const changeDraft = (change: Partial<ProviderConfigFields>) => {
    onAiConfigDraftChange({
      provider: aiConfigDraft.provider,
      model: aiConfigDraft.model,
      baseUrl: aiConfigDraft.baseUrl,
      ...change
    } as AiProviderConfigInput);
  };

  return (
    <section className="settings-diagnostics-section provider-settings" aria-labelledby="provider-settings-heading">
      <h2 id="provider-settings-heading">{heading ?? t(language, 'diagnostics.provider')}</h2>
      <p className="provider-status">
        <strong>{aiStatus.provider}</strong>
        {' · '}
        <span>{t(language, aiStatus.configured ? 'provider.configured' : 'provider.notConfigured')}</span>
        {' · '}
        <span>{aiStatus.model}</span>
      </p>

      <div className="provider-settings-fields">
        <label>
          {t(language, 'provider.provider')}
          <select
            value={aiConfigDraft.provider}
            onChange={(event) => changeDraft({ provider: event.target.value === 'deepseek' ? 'deepseek' : 'openai' })}
            disabled={isProviderBusy}
          >
            <option value="openai">OpenAI</option>
            <option value="deepseek">DeepSeek</option>
          </select>
        </label>
        <label>
          {t(language, 'provider.model')}
          <input
            data-field="provider-model"
            value={aiConfigDraft.model}
            onChange={(event) => changeDraft({ model: event.target.value })}
            disabled={isProviderBusy}
          />
        </label>
        <label>
          {t(language, 'provider.baseUrl')}
          <input
            data-field="provider-base-url"
            value={aiConfigDraft.baseUrl}
            onChange={(event) => changeDraft({ baseUrl: event.target.value })}
            disabled={isProviderBusy}
          />
        </label>
        <label>
          {t(language, 'provider.apiKey')}
          <input
            aria-label={t(language, 'provider.apiKey')}
            type="password"
            data-field="provider-api-key"
            value={aiConfigDraft.apiKey}
            autoComplete="off"
            placeholder={t(language, 'provider.apiKeyPlaceholder')}
            onChange={(event) => onApiKeyChange(event.target.value)}
            disabled={isProviderBusy}
          />
        </label>
      </div>

      <div className="provider-settings-actions">
          <button type="button" data-action="apply-provider-config" onClick={onApplyAiConfig} disabled={isProviderBusy}>
          {t(language, isAiConfigApplying ? 'provider.applying' : 'provider.apply')}
        </button>
        <button type="button" data-action="test-provider-connection" onClick={onTestAiConnection} disabled={isProviderBusy}>
          {t(language, isAiTesting ? 'provider.testingConnection' : 'provider.testConnection')}
        </button>
        {onClearApiKey ? (
          <button type="button" data-action="clear-api-key" onClick={onClearApiKey} disabled={isProviderBusy}>
            {clearApiKeyLabel ?? t(language, 'settings.clearApiKey')}
          </button>
        ) : null}
      </div>

      {aiConnectionResult ? (
        <p role={aiConnectionResult.ok ? 'status' : 'alert'}>
          {redactDiagnosticText(aiConnectionResult.message)}
        </p>
      ) : null}
    </section>
  );
}
