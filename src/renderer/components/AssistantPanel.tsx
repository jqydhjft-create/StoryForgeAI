import { useState } from 'react';
import type { AiConnectionTestResult, AiProviderConfigInput, AiProviderStatus, StoryProject, SummaryData } from '../../shared/types.js';
import type { Language } from '../i18n';
import { t } from '../i18n';
import { buildNovelExport } from '../services/exportService';
import { IdeaWizard } from './IdeaWizard';
import type { StoryWorkflowResult, WorkflowGateReport } from '../services/storyWorkflow';
import type { NextChapterWorkflowResult } from '../services/nextChapterWorkflow';
import type { LiveReviewWarning } from '../services/liveReviewService';

interface AssistantPanelProps {
  language: Language;
  project: StoryProject;
  summary: SummaryData;
  onRefreshSummary: () => void;
  onSeed: (workflow: StoryWorkflowResult) => void;
  gateReports: WorkflowGateReport[];
  aiStatus: AiProviderStatus;
  aiConnectionResult: AiConnectionTestResult | null;
  workflowLog: string[];
  aiConfigDraft: AiProviderConfigInput;
  isSummaryRefreshing: boolean;
  isAiTesting: boolean;
  isAiConfigApplying: boolean;
  isFailedGateRetrying: boolean;
  isNextChapterGenerating: boolean;
  canRetryFailedGate: boolean;
  nextChapterStatus: string;
  nextChapterNotes: string[];
  focusedChapterTitle: string;
  pendingStoryDraft: StoryWorkflowResult | null;
  pendingChapterDraft: NextChapterWorkflowResult | null;
  liveReviewWarnings: LiveReviewWarning[];
  collapsed: boolean;
  onAiConfigDraftChange: (draft: AiProviderConfigInput) => void;
  onApplyAiConfig: () => void;
  onTestAiConnection: () => void;
  onRetryFailedGate: () => void;
  onGenerateNextChapter: () => void;
  onConfirmStoryDraft: () => void;
  onConfirmChapterDraft: () => void;
  onDiscardDraft: () => void;
  onToggleCollapsed: () => void;
  exportStatus: string;
  onWriteExports: () => void;
  onOpenExportsFolder: () => void;
}

type AssistantTab = 'generate' | 'review' | 'summary' | 'export';

const retryTargetLabels: Record<NonNullable<WorkflowGateReport['retryTarget']>, string> = {
  'theme-generator': 'theme-generator',
  'world-generator': 'world-generator',
  'character-generator': 'character-generator',
  'plot-designer': 'plot-designer',
  'scene-writing-workshop': 'scene-writing-workshop'
};

export function AssistantPanel({
  language,
  project,
  summary,
  onRefreshSummary,
  onSeed,
  gateReports,
  aiStatus,
  aiConnectionResult,
  workflowLog,
  aiConfigDraft,
  isSummaryRefreshing,
  isAiTesting,
  isAiConfigApplying,
  isFailedGateRetrying,
  isNextChapterGenerating,
  canRetryFailedGate,
  nextChapterStatus,
  nextChapterNotes,
  focusedChapterTitle,
  pendingStoryDraft,
  pendingChapterDraft,
  liveReviewWarnings,
  collapsed,
  onAiConfigDraftChange,
  onApplyAiConfig,
  onTestAiConnection,
  onRetryFailedGate,
  onGenerateNextChapter,
  onConfirmStoryDraft,
  onConfirmChapterDraft,
  onDiscardDraft,
  onToggleCollapsed,
  exportStatus,
  onWriteExports,
  onOpenExportsFolder
}: AssistantPanelProps) {
  const [activeTab, setActiveTab] = useState<AssistantTab>('generate');
  const novelExport = buildNovelExport(project.settings.name, project.chapters);
  const hasRetryableFailedGate = gateReports.some((report) => report.status === 'failed' && report.retryTarget);
  const tabs: AssistantTab[] = ['generate', 'review', 'summary', 'export'];

  if (collapsed) {
    return (
      <aside className="assistant-panel collapsed">
        <button className="assistant-toggle" onClick={onToggleCollapsed} title={t(language, 'assistant.expand')}>
          +
        </button>
      </aside>
    );
  }

  return (
    <aside className="assistant-panel">
      <div className="assistant-header">
        <div className="assistant-tabs" role="tablist" aria-label="Assistant workspace">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? 'active' : ''}
              onClick={() => setActiveTab(tab)}
              role="tab"
              aria-selected={activeTab === tab}
            >
              {t(language, `assistant.tab.${tab}`)}
            </button>
          ))}
        </div>
        <button className="assistant-toggle" onClick={onToggleCollapsed} title={t(language, 'assistant.collapse')}>
          x
        </button>
      </div>

      {activeTab === 'generate' ? (
        <>
          <IdeaWizard language={language} onGenerated={onSeed} />
          <section>
            <h3>{focusedChapterTitle ? `${t(language, 'assistant.nextChapter')} · ${focusedChapterTitle}` : t(language, 'assistant.nextChapter')}</h3>
            <button onClick={onGenerateNextChapter} disabled={isNextChapterGenerating}>
              {t(language, isNextChapterGenerating ? 'assistant.generatingNextChapter' : 'assistant.nextChapter')}
            </button>
            {nextChapterStatus ? <p className="status-text">{nextChapterStatus}</p> : null}
            {nextChapterNotes.length > 0 ? (
              <ul className="next-chapter-notes">
                {nextChapterNotes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            ) : null}
          </section>
          {pendingStoryDraft || pendingChapterDraft ? (
            <section className="draft-preview">
              <h3>{t(language, pendingStoryDraft ? 'assistant.pendingStoryDraft' : 'assistant.pendingChapterDraft')}</h3>
              <textarea
                readOnly
                value={
                  pendingStoryDraft
                    ? JSON.stringify(
                        {
                          title: pendingStoryDraft.seed.concept.title,
                          chapter: pendingStoryDraft.initialChapter.meta.title,
                          gates: pendingStoryDraft.gateReports.map((report) => `${report.label}: ${report.status}`)
                        },
                        null,
                        2
                      )
                    : `${pendingChapterDraft?.chapter.content ?? ''}\n\n${pendingChapterDraft?.reviewNotes.join('\n') ?? ''}`
                }
              />
              <div className="draft-actions">
                <button onClick={pendingStoryDraft ? onConfirmStoryDraft : onConfirmChapterDraft}>
                  {t(language, 'assistant.confirmDraft')}
                </button>
                <button className="secondary" onClick={onDiscardDraft}>
                  {t(language, 'assistant.discardDraft')}
                </button>
              </div>
            </section>
          ) : null}
          <section>
        <h3>AI workflow</h3>
        <div className="ai-status">
          <strong>{aiStatus.provider}</strong>
          <span>{aiStatus.configured ? 'configured' : 'mock fallback'}</span>
          <p>{aiStatus.configured ? `${aiStatus.model} @ ${aiStatus.baseUrl}` : 'No provider key is configured for this session.'}</p>
        </div>
        <div className="ai-config-grid">
          <select
            aria-label="AI provider"
            value={aiConfigDraft.provider}
            onChange={(event) =>
              onAiConfigDraftChange({
                ...aiConfigDraft,
                provider: event.target.value === 'deepseek' ? 'deepseek' : 'openai',
                model: event.target.value === 'deepseek' ? 'deepseek-v4-flash' : 'gpt-4o-mini',
                baseUrl: event.target.value === 'deepseek' ? 'https://api.deepseek.com' : 'https://api.openai.com/v1'
              })
            }
            disabled={isAiConfigApplying}
          >
            <option value="openai">OpenAI</option>
            <option value="deepseek">DeepSeek</option>
          </select>
          <input
            aria-label="AI API key"
            placeholder="API key"
            type="password"
            value={aiConfigDraft.apiKey}
            onChange={(event) => onAiConfigDraftChange({ ...aiConfigDraft, apiKey: event.target.value })}
            disabled={isAiConfigApplying}
          />
          <input
            aria-label="AI model"
            placeholder="Model"
            value={aiConfigDraft.model}
            onChange={(event) => onAiConfigDraftChange({ ...aiConfigDraft, model: event.target.value })}
            disabled={isAiConfigApplying}
          />
          <input
            aria-label="AI base URL"
            placeholder="Base URL"
            value={aiConfigDraft.baseUrl}
            onChange={(event) => onAiConfigDraftChange({ ...aiConfigDraft, baseUrl: event.target.value })}
            disabled={isAiConfigApplying}
          />
          <button onClick={onApplyAiConfig} disabled={isAiConfigApplying}>
            {t(language, isAiConfigApplying ? 'assistant.applyingAiConfig' : 'assistant.applyAiConfig')}
          </button>
        </div>
        <div className="ai-test-row">
          <button onClick={onTestAiConnection} disabled={isAiTesting}>
            {t(language, isAiTesting ? 'assistant.testingAi' : 'assistant.testAi')}
          </button>
          {aiConnectionResult ? (
            <span className={aiConnectionResult.ok ? 'ai-test-ok' : 'ai-test-failed'}>{aiConnectionResult.message}</span>
          ) : null}
        </div>
        {workflowLog.length > 0 ? (
          <ol className="workflow-log">
            {workflowLog.map((entry, index) => (
              <li key={`${entry}-${index}`}>{entry}</li>
            ))}
          </ol>
        ) : null}
          </section>
        </>
      ) : null}

      {activeTab === 'review' ? (
        <>
        <section>
        <h3>{t(language, 'assistant.liveWarnings')}</h3>
        {liveReviewWarnings.length > 0 ? (
          <ul className="gate-report-list">
            {liveReviewWarnings.map((warning) => (
              <li key={`${warning.code}-${warning.chapterId ?? 'project'}`}>
                <strong>{warning.code}</strong>
                <p>{warning.message}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p>{t(language, 'assistant.noLiveWarnings')}</p>
        )}
        </section>
        <section>
        <h3>{t(language, 'assistant.review')}</h3>
        {gateReports.length > 0 ? (
          <ul className="gate-report-list">
            {gateReports.map((report) => (
              <li key={report.id}>
                <strong>{report.label}</strong>
                <span>{report.status === 'passed' ? '通过' : '不通过'}</span>
                <p>{report.summary}</p>
                {report.status === 'failed' && report.retryTarget ? (
                  <p className="retry-target">
                    {language === 'zh-CN' ? '建议重跑：' : 'Retry target: '}
                    {retryTargetLabels[report.retryTarget]}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p>{t(language, 'assistant.reviewOk')}</p>
        )}
        {hasRetryableFailedGate ? (
          <button onClick={onRetryFailedGate} disabled={!canRetryFailedGate || isFailedGateRetrying}>
            {t(language, isFailedGateRetrying ? 'assistant.retryingFailedGate' : 'assistant.retryFailedGate')}
          </button>
        ) : null}
        </section>
        </>
      ) : null}

      {activeTab === 'summary' ? (
        <section>
          <h3>{t(language, 'assistant.summary')}</h3>
          <div className="summary-grid">
            <div>
              <strong>{summary.timeline.length}</strong>
              <span>{t(language, 'summary.timelineEntries')}</span>
            </div>
            <div>
              <strong>{summary.locations.length}</strong>
              <span>{t(language, 'summary.locations')}</span>
            </div>
            <div>
              <strong>{summary.characters.length}</strong>
              <span>{t(language, 'summary.characters')}</span>
            </div>
          </div>
          <button onClick={onRefreshSummary} disabled={isSummaryRefreshing}>
            {t(language, isSummaryRefreshing ? 'assistant.refreshingSummary' : 'assistant.refreshSummary')}
          </button>
        </section>
      ) : null}

      {activeTab === 'export' ? (
        <section>
        <h3>{t(language, 'assistant.exportPreview')}</h3>
        <div className="export-actions">
          <button onClick={onWriteExports}>{t(language, 'assistant.writeExports')}</button>
          <button onClick={onOpenExportsFolder}>{t(language, 'assistant.openExportsFolder')}</button>
          {exportStatus ? <span>{exportStatus}</span> : null}
        </div>
        <textarea value={novelExport} readOnly />
        </section>
      ) : null}
    </aside>
  );
}
