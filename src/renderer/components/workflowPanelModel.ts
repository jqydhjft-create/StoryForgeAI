import type { StoryWorkflowState, WorkflowStageId } from '../../shared/types.js';
import type { WorkflowChapterDraftResult } from '../services/workflowChapterLoop';

export type WorkflowPanelAction = 'generate' | 'confirm' | 'regenerate' | 'force_save';

export interface WorkflowPanelCallbacks {
  onGenerateStage: (stage: WorkflowStageId) => void;
  onConfirmStage: (stage: WorkflowStageId) => void;
  onRegenerateStage: (stage: WorkflowStageId) => void;
  onForceSaveChapter: () => void;
}

export interface WorkflowPanelViewInput {
  workflow: StoryWorkflowState;
  drafts: Partial<Record<WorkflowStageId, unknown>>;
  pendingChapterDraft: WorkflowChapterDraftResult | null;
  viewedStage: WorkflowStageId;
  isBusy: boolean;
}

export interface WorkflowPanelView {
  stage: WorkflowStageId;
  mode: 'current' | 'history';
  artifact: unknown;
  primaryAction: Extract<WorkflowPanelAction, 'generate' | 'confirm'> | null;
  canRegenerate: boolean;
  canForceSave: boolean;
  reviewBlocked: boolean;
  isBusy: boolean;
}

export function artifactForWorkflowStage(
  workflow: StoryWorkflowState,
  drafts: Partial<Record<WorkflowStageId, unknown>>,
  pendingChapterDraft: WorkflowChapterDraftResult | null,
  stage: WorkflowStageId
): unknown {
  if (drafts[stage] !== undefined) {
    return drafts[stage];
  }

  switch (stage) {
    case 'intake':
      return workflow.artifacts.initialSettingBook;
    case 'world_outline':
      return workflow.artifacts.worldOutline;
    case 'character_bible':
      return workflow.artifacts.characterBible;
    case 'act_timeline':
      return workflow.artifacts.actTimeline;
    case 'scene_outline':
      return workflow.artifacts.sceneOutline;
    case 'chapter_draft':
      return pendingChapterDraft ?? workflow.artifacts.chapterReviews;
    case 'act_scoring': {
      const actId = workflow.artifacts.actTimeline?.acts[0]?.id;
      return actId ? workflow.artifacts.actScores?.[actId] : workflow.artifacts.actScores;
    }
    case 'full_review':
      return workflow.artifacts.fullReview;
  }
}

export function canInspectWorkflowStage(workflow: StoryWorkflowState, stage: WorkflowStageId): boolean {
  return stage === workflow.currentStage || workflow.stages[stage].status === 'confirmed';
}

export function resolveWorkflowPanelView(input: WorkflowPanelViewInput): WorkflowPanelView {
  const isCurrent = input.viewedStage === input.workflow.currentStage;
  const artifact = artifactForWorkflowStage(
    input.workflow,
    input.drafts,
    input.pendingChapterDraft,
    input.viewedStage
  );
  const reviewBlocked =
    isCurrent &&
    input.viewedStage === 'chapter_draft' &&
    input.pendingChapterDraft?.saveDecision === 'blocked_by_review';
  const hasPendingChapter = isCurrent && input.viewedStage === 'chapter_draft' && Boolean(input.pendingChapterDraft);
  const hasConfirmableDraft =
    isCurrent && input.viewedStage !== 'chapter_draft' && input.drafts[input.viewedStage] !== undefined;

  return {
    stage: input.viewedStage,
    mode: isCurrent ? 'current' : 'history',
    artifact,
    primaryAction: !isCurrent || reviewBlocked
      ? null
      : hasPendingChapter || hasConfirmableDraft
        ? 'confirm'
        : 'generate',
    canRegenerate: isCurrent && !input.isBusy && !reviewBlocked && (hasPendingChapter || hasConfirmableDraft),
    canForceSave: reviewBlocked && Boolean(input.pendingChapterDraft),
    reviewBlocked,
    isBusy: input.isBusy
  };
}

export function dispatchWorkflowPanelAction(
  action: WorkflowPanelAction,
  stage: WorkflowStageId,
  callbacks: WorkflowPanelCallbacks
): void {
  switch (action) {
    case 'generate':
      callbacks.onGenerateStage(stage);
      break;
    case 'confirm':
      callbacks.onConfirmStage(stage);
      break;
    case 'regenerate':
      callbacks.onRegenerateStage(stage);
      break;
    case 'force_save':
      callbacks.onForceSaveChapter();
      break;
  }
}
