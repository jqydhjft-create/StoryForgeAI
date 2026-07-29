import { useState } from 'react';
import type { AiConnectionTestResult, AiProviderStatus } from '../../shared/types.js';
import type { Language } from '../i18n';
import { t } from '../i18n';
import type { ProviderConfigFields } from './ProviderSettings';
import { redactDiagnosticText } from './diagnosticsRedaction';

interface StoryStarterProps {
  language: Language;
  initialIdea: string;
  isBusy: boolean;
  statusText: string;
  error: string;
  aiStatus: AiProviderStatus;
  aiConnectionResult: AiConnectionTestResult | null;
  aiConfigDraft: ProviderConfigFields;
  isAiTesting: boolean;
  isAiConfigApplying: boolean;
  onIdeaChange: (idea: string) => void;
  onRandomSeed: () => Promise<string>;
  onStartWorkflow: () => void;
  onAiConfigDraftChange: (draft: ProviderConfigFields) => void;
  onApiKeyChange: (apiKey: string) => void;
  onApplyAiConfig: () => void;
  onTestAiConnection: () => void;
  onClearApiKey?: () => void;
}

export function StoryStarter({
  language,
  initialIdea,
  isBusy,
  statusText,
  error,
  aiStatus,
  aiConnectionResult,
  aiConfigDraft,
  isAiTesting,
  isAiConfigApplying,
  onIdeaChange,
  onRandomSeed,
  onStartWorkflow,
  onAiConfigDraftChange,
  onApiKeyChange,
  onApplyAiConfig,
  onTestAiConnection,
  onClearApiKey
}: StoryStarterProps) {
  const [isGeneratingSeed, setIsGeneratingSeed] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const isProviderBusy = isAiTesting || isAiConfigApplying;

  async function handleRandomSeed() {
    setIsGeneratingSeed(true);
    try {
      const idea = await onRandomSeed();
      onIdeaChange(idea);
    } catch {
      // keep current idea on failure
    } finally {
      setIsGeneratingSeed(false);
    }
  }

  return (
    <section className="story-starter">
      <div className="story-starter-card">
        <p className="eyebrow">{t(language, 'starter.title')}</p>
        <h2>{t(language, 'starter.heading')}</h2>

        <div className="story-starter-field">
          <label className="project-name-field">
            <textarea
              className="starter-idea-input"
              value={initialIdea}
              placeholder={t(language, 'starter.ideaPlaceholder')}
              onChange={(event) => onIdeaChange(event.target.value)}
              rows={4}
              disabled={isBusy}
            />
          </label>
          <button
            className="secondary"
            onClick={handleRandomSeed}
            disabled={isBusy || isGeneratingSeed}
            type="button"
          >
            {isGeneratingSeed ? t(language, 'starter.generating') : t(language, 'starter.randomSeed')}
          </button>
        </div>

        {initialIdea.trim() ? (
          <div className="seed-preview">{initialIdea}</div>
        ) : null}

        <div className="starter-config">
          <button className="secondary starter-config-toggle" onClick={() => setShowConfig(!showConfig)} type="button">
            {showConfig ? '▲' : '▼'} {t(language, 'starter.aiConfig')}
            {aiStatus.configured ? (
              <span className="ai-test-ok"> ✓ {aiStatus.provider}</span>
            ) : (
              <span className="ai-test-failed"> ✗ {t(language, 'starter.notConfigured')}</span>
            )}
          </button>
          {onClearApiKey ? (
            <button
              type="button"
              className="secondary"
              data-action="clear-api-key"
              onClick={() => { setApiKeyInput(''); onClearApiKey(); }}
              disabled={isProviderBusy}
            >
              {t(language, 'settings.clearApiKey')}
            </button>
          ) : null}

          {showConfig ? (
            <div className="starter-config-body">
              <div className="ai-config-grid">
                <select
                  value={aiConfigDraft.provider}
                  onChange={(event) =>
                    onAiConfigDraftChange({
                      ...aiConfigDraft,
                      provider: event.target.value === 'deepseek' ? 'deepseek' : 'openai',
                      model: event.target.value === 'deepseek' ? 'deepseek-v4-pro' : 'gpt-5.6',
                      baseUrl: event.target.value === 'deepseek' ? 'https://api.deepseek.com' : 'https://api.openai.com/v1'
                    })
                  }
                  disabled={isAiConfigApplying}
                >
                  <option value="openai">OpenAI</option>
                  <option value="deepseek">DeepSeek</option>
                </select>
                <input placeholder={t(language, 'starter.apiKeyPlaceholder')} type="password" autoComplete="off" value={apiKeyInput}
                  onChange={(e) => { setApiKeyInput(e.target.value); onApiKeyChange(e.target.value); }}
                  disabled={isProviderBusy} />
                <input placeholder={t(language, 'starter.modelPlaceholder')} value={aiConfigDraft.model}
                  onChange={(e) => onAiConfigDraftChange({ ...aiConfigDraft, model: e.target.value })}
                  disabled={isProviderBusy} />
                <input placeholder={t(language, 'starter.baseUrlPlaceholder')} value={aiConfigDraft.baseUrl}
                  onChange={(e) => onAiConfigDraftChange({ ...aiConfigDraft, baseUrl: e.target.value })}
                  disabled={isProviderBusy} />
                <button onClick={() => { setApiKeyInput(''); onApplyAiConfig(); }} disabled={isProviderBusy}>
                  {t(language, isAiConfigApplying ? 'starter.applying' : 'starter.apply')}
                </button>
              </div>
              <div className="ai-test-row">
                <button onClick={onTestAiConnection} disabled={isProviderBusy}>
                  {t(language, isAiTesting ? 'starter.testing' : 'starter.test')}
                </button>
                {aiConnectionResult ? (
                  <span className={aiConnectionResult.ok ? 'ai-test-ok' : 'ai-test-failed'}>{redactDiagnosticText(aiConnectionResult.message)}</span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <button
          className="primary story-starter-launch"
          onClick={onStartWorkflow}
          disabled={isBusy || !initialIdea.trim()}
          type="button"
        >
          {t(language, 'starter.launch')}
        </button>

        {statusText ? <p className="status-text">{statusText}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </section>
  );
}
