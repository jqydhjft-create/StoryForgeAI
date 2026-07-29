import type { StoryWorkflowState, WorkflowStageId, WorkflowStageStatus } from '../../shared/types.js';
import type { Language } from '../i18n.js';
import { t } from '../i18n.js';
import { canInspectWorkflowStage } from './workflowPanelModel.js';

export interface WorkspaceHeaderProps {
  language: Language;
  projectName: string;
  workflow: StoryWorkflowState;
  viewedStage: WorkflowStageId;
  onViewStage: (stage: WorkflowStageId) => void;
  onOpenDiagnostics: () => void;
}

const orderedStages: WorkflowStageId[] = [
  'intake',
  'world_outline',
  'character_bible',
  'act_timeline',
  'scene_outline',
  'chapter_draft',
  'act_scoring',
  'full_review'
];

function stageLabelKey(stage: WorkflowStageId): Parameters<typeof t>[1] {
  return `workflow.stage.${stage}` as Parameters<typeof t>[1];
}

function statusLabelKey(status: WorkflowStageStatus): Parameters<typeof t>[1] {
  return `workflow.status.${status}` as Parameters<typeof t>[1];
}

export function WorkspaceHeader({
  language,
  projectName,
  workflow,
  viewedStage,
  onViewStage,
  onOpenDiagnostics
}: WorkspaceHeaderProps) {
  const currentIndex = orderedStages.indexOf(workflow.currentStage);
  const currentLabel = t(language, stageLabelKey(workflow.currentStage));
  const viewAllLabel = t(language, 'workspace.viewAll');
  const diagnosticsLabel = t(language, 'workspace.settings');

  return (
    <div className="workspace-header-content">
      <div className="workspace-project-context">
        <h1>{projectName}</h1>
        <div className="workspace-current-stage">
          <span>{t(language, 'workflow.currentStage')}</span>
          <strong>{currentLabel}</strong>
          <span className="workspace-stage-position">{currentIndex + 1} / {orderedStages.length}</span>
        </div>
      </div>

      <details className="workspace-progress-disclosure" open>
        <summary>{viewAllLabel}</summary>
        <nav className="workspace-progress" aria-label="Story workflow progress">
          {orderedStages.map((stage) => {
            const state = workflow.stages[stage];
            const isCurrent = stage === workflow.currentStage;
            const isViewed = stage === viewedStage;
            const label = t(language, stageLabelKey(stage));

            return (
              <button
                key={stage}
                type="button"
                className={`workspace-progress-node${isViewed ? ' selected' : ''}`}
                data-workflow-stage={stage}
                data-stage-status={state.status}
                aria-current={isCurrent ? 'step' : undefined}
                aria-pressed={isViewed}
                aria-label={`${label}: ${t(language, statusLabelKey(state.status))}`}
                disabled={!canInspectWorkflowStage(workflow, stage)}
                onClick={() => onViewStage(stage)}
              >
                <span className="workspace-progress-dot" aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </details>

      <button
        type="button"
        className="workspace-diagnostics-button"
        data-action="open-diagnostics"
        onClick={onOpenDiagnostics}
      >
        {diagnosticsLabel}
      </button>
    </div>
  );
}
