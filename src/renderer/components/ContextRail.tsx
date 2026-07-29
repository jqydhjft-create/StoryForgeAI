import type { StoryWorkflowState, WorkflowStageId } from '../../shared/types.js';
import type { Language } from '../i18n';
import { t } from '../i18n';
import type { WorkflowChapterDraftResult } from '../services/workflowChapterLoop';
import { ModelRunCard } from './ModelRunCard';
import { WorkflowArtifactPreview } from './WorkflowArtifactPreview';
import {
  dispatchWorkflowPanelAction,
  resolveWorkflowPanelView,
  type WorkflowPanelCallbacks
} from './workflowPanelModel';
import { resolveContextRailView } from './workspaceModel';

export interface ContextRailProps extends WorkflowPanelCallbacks {
  language: Language;
  workflow: StoryWorkflowState;
  drafts: Partial<Record<WorkflowStageId, unknown>>;
  pendingChapterDraft: WorkflowChapterDraftResult | null;
  viewedStage: WorkflowStageId;
  expanded: boolean;
  isBusy: boolean;
  statusText: string;
  errorText: string;
  startedAt?: number | null;
  runStage?: WorkflowStageId | null;
  runLabel?: string | null;
  runOutcome?: 'success' | 'error' | null;
  completedElapsedSeconds?: number | null;
  now: number;
  onReturnCurrent: () => void;
  onRetry: () => void;
  onToggle: () => void;
}

function stageLabel(language: Language, stage: WorkflowStageId): string {
  return t(language, `workflow.stage.${stage}` as Parameters<typeof t>[1]);
}

function generateLabel(language: Language, stage: WorkflowStageId): string {
  if (stage === 'act_scoring') return t(language, 'workflow.scoreAct');
  if (stage === 'full_review') return t(language, 'workflow.fullReview');
  return `${t(language, 'workflow.generate')} ${stageLabel(language, stage)}`;
}

export function ContextRail(props: ContextRailProps) {
  const panel = resolveWorkflowPanelView({
    workflow: props.workflow,
    drafts: props.drafts,
    pendingChapterDraft: props.pendingChapterDraft,
    viewedStage: props.viewedStage,
    isBusy: props.isBusy
  });
  const rail = resolveContextRailView({
    workflow: props.workflow,
    drafts: props.drafts,
    pendingChapterDraft: props.pendingChapterDraft,
    viewedStage: props.viewedStage,
    isBusy: props.isBusy,
    statusText: props.statusText,
    errorText: props.errorText,
    startedAt: props.startedAt,
    now: props.now,
    outcome: props.runOutcome,
    completedElapsedSeconds: props.completedElapsedSeconds
  });

  if (!rail) return null;

  const callbacks: WorkflowPanelCallbacks = {
    onGenerateStage: props.onGenerateStage,
    onConfirmStage: props.onConfirmStage,
    onRegenerateStage: props.onRegenerateStage,
    onForceSaveChapter: props.onForceSaveChapter
  };
  const runAction = (action: 'generate' | 'confirm' | 'regenerate' | 'force_save') => {
    dispatchWorkflowPanelAction(action, panel.stage, callbacks);
  };
  const canRetry = panel.mode === 'current' && rail.runStatus === 'error' && !props.isBusy;

  return (
    <aside
      className={`workflow-context-rail${props.expanded ? ' expanded' : ' collapsed'}`}
      aria-label={t(props.language, 'workspace.contextRail')}
      aria-busy={props.isBusy}
    >
      <ModelRunCard
        language={props.language}
        status={rail.runStatus}
        stageLabel={props.runLabel ?? stageLabel(props.language, props.runStage ?? rail.stage)}
        elapsedSeconds={rail.elapsedSeconds}
        message={rail.runStatus === 'error' ? props.errorText : props.statusText}
        errorText={props.errorText}
        canRetry={canRetry}
        onRetry={props.onRetry}
        onToggle={props.onToggle}
        expanded={props.expanded}
      />

      {props.expanded ? (
        <div className="workflow-context-rail-body">
          <header className="workflow-context-header">
            <span>{panel.mode === 'history'
              ? t(props.language, 'workflow.completedStage')
              : t(props.language, 'workflow.currentStage')}</span>
            <h3>{stageLabel(props.language, panel.stage)}</h3>
            {panel.mode === 'history' ? (
              <button type="button" onClick={props.onReturnCurrent}>
                {t(props.language, 'workflow.returnCurrent')}
              </button>
            ) : null}
          </header>

          <div className="workflow-context-preview">
            <WorkflowArtifactPreview
              language={props.language}
              stage={panel.stage}
              artifact={panel.artifact}
            />
          </div>

          {panel.reviewBlocked ? (
            <div className="workflow-review-alert">
              <strong>{t(props.language, 'workflow.reviewBlocked')}</strong>
              <p>{t(props.language, 'workflow.forceSaveWarning')}</p>
            </div>
          ) : null}

          {panel.mode === 'current' && !props.isBusy ? (
            <div className="workflow-stage-actions">
              {panel.primaryAction === 'generate' ? (
                <button type="button" className="primary" onClick={() => runAction('generate')}>
                  {generateLabel(props.language, panel.stage)}
                </button>
              ) : null}
              {panel.primaryAction === 'confirm' ? (
                <button type="button" className="primary" onClick={() => runAction('confirm')}>
                  {panel.stage === 'chapter_draft'
                    ? t(props.language, 'workflow.saveChapter')
                    : t(props.language, 'workflow.confirmNext')}
                </button>
              ) : null}
              {panel.canRegenerate ? (
                <button type="button" onClick={() => runAction('regenerate')}>
                  {t(props.language, 'workflow.regenerate')}
                </button>
              ) : null}
              {panel.canForceSave ? (
                <button type="button" className="workflow-force-save" onClick={() => runAction('force_save')}>
                  {t(props.language, 'workflow.forceSave')}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
