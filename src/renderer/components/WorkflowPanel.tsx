import { useMemo, useState } from 'react';
import type { StoryWorkflowState, WorkflowStageId } from '../../shared/types.js';
import type { Language } from '../i18n';
import { t } from '../i18n';

interface WorkflowPanelProps {
  language: Language;
  workflow: StoryWorkflowState;
  activeArtifactText: string;
  isBusy: boolean;
  statusText?: string;
  onGenerateStage: (stage: WorkflowStageId) => void;
  onConfirmStage: (stage: WorkflowStageId) => void;
  onRegenerateStage: (stage: WorkflowStageId) => void;
  onGenerateChapter: () => void;
  onForceSaveChapter: () => void;
  onScoreAct: () => void;
  onFullReview: () => void;
}

const orderedStages: WorkflowStageId[] = [
  'intake',
  'world_outline',
  'act_timeline',
  'scene_outline',
  'chapter_draft',
  'act_scoring',
  'full_review'
];

function labelKey(stage: WorkflowStageId): Parameters<typeof t>[1] {
  return `workflow.stage.${stage}` as Parameters<typeof t>[1];
}

export function WorkflowPanel({
  language,
  workflow,
  activeArtifactText,
  isBusy,
  statusText,
  onGenerateStage,
  onConfirmStage,
  onRegenerateStage,
  onGenerateChapter,
  onForceSaveChapter,
  onScoreAct,
  onFullReview
}: WorkflowPanelProps) {
  const [selectedStage, setSelectedStage] = useState<WorkflowStageId>(workflow.currentStage);
  const effectiveStage = workflow.stages[selectedStage] ? selectedStage : workflow.currentStage;
  const stageState = workflow.stages[effectiveStage];
  const isLocked = stageState.status === 'locked';
  const isChapterStage = effectiveStage === 'chapter_draft';
  const isScoringStage = effectiveStage === 'act_scoring';
  const isFullReviewStage = effectiveStage === 'full_review';
  const canRunStage = !isLocked && !isChapterStage;
  const previewText = useMemo(() => activeArtifactText || '{}', [activeArtifactText]);

  return (
    <section className="workflow-panel">
      <div className="workflow-stage-list" aria-label="Story workflow">
        {orderedStages.map((stage, index) => {
          const state = workflow.stages[stage];
          const isCurrent = stage === workflow.currentStage;
          const isSelected = stage === effectiveStage;

          return (
            <button
              key={stage}
              className={`${isCurrent ? 'workflow-stage-current' : ''} ${isSelected ? 'workflow-stage-selected' : ''}`.trim()}
              onClick={() => setSelectedStage(stage)}
              type="button"
            >
              <span>{index}</span>
              <strong>{t(language, labelKey(stage))}</strong>
              <em>{state.status}</em>
            </button>
          );
        })}
      </div>

      <div className="workflow-actions">
        {canRunStage ? (
          <>
            <button onClick={() => onGenerateStage(effectiveStage)} disabled={isBusy} type="button">
              {t(language, 'workflow.generate')}
            </button>
            <button onClick={() => onConfirmStage(effectiveStage)} disabled={isBusy} type="button">
              {t(language, 'workflow.confirm')}
            </button>
            <button className="secondary" onClick={() => onRegenerateStage(effectiveStage)} disabled={isBusy} type="button">
              {t(language, 'workflow.regenerate')}
            </button>
          </>
        ) : null}
        {isChapterStage ? (
          <>
            <button onClick={onGenerateChapter} disabled={isBusy} type="button">
              {t(language, 'workflow.generate')}
            </button>
            <button onClick={() => onConfirmStage(effectiveStage)} disabled={isBusy} type="button">
              {t(language, 'workflow.confirm')}
            </button>
            <button className="secondary" onClick={onForceSaveChapter} disabled={isBusy} type="button">
              {t(language, 'workflow.forceSave')}
            </button>
          </>
        ) : null}
        {isScoringStage ? (
          <button onClick={onScoreAct} disabled={isBusy} type="button">
            {t(language, 'workflow.scoreAct')}
          </button>
        ) : null}
        {isFullReviewStage ? (
          <button onClick={onFullReview} disabled={isBusy} type="button">
            {t(language, 'workflow.fullReview')}
          </button>
        ) : null}
      </div>

      {statusText ? <p className="status-text">{statusText}</p> : null}
      <textarea className="workflow-artifact-preview" value={previewText} readOnly />
    </section>
  );
}
