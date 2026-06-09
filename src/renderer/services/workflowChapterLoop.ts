import type { ChapterContextPacket, ChapterReviewReport, StoryProject } from '../../shared/types.js';
import type { DraftSaveDecision } from './chapterDraftWorkflow';
import type { StoryPluginRegistry } from './plugins/storyPluginTypes';
import { buildChapterContextPacket } from './chapterContext';
import { forceSaveDraftAfterWarning, generateReviewedChapterDraft } from './chapterDraftWorkflow';

export interface WorkflowChapterDraftResult {
  contextPacket: ChapterContextPacket;
  chapter: unknown;
  review: ChapterReviewReport;
  saveDecision: DraftSaveDecision;
}

export function forceSaveWorkflowChapterDraft(input: { secondConfirmation: boolean }) {
  return forceSaveDraftAfterWarning(input);
}

export async function generateWorkflowChapterDraft(
  registry: StoryPluginRegistry,
  project: StoryProject,
  actId: string,
  chapterId: number
): Promise<WorkflowChapterDraftResult> {
  const actTimeline = project.workflow.artifacts.actTimeline;
  if (!actTimeline) {
    throw new Error('Workflow act timeline is missing');
  }

  const sceneOutline = project.workflow.artifacts.sceneOutline;
  if (!sceneOutline) {
    throw new Error('Workflow scene outline is missing');
  }

  const contextPacket = buildChapterContextPacket({
    project,
    actTimeline,
    sceneOutline,
    memory: project.workflow.memory,
    actId,
    chapterId
  });
  const draft = await generateReviewedChapterDraft(registry, contextPacket);

  return {
    contextPacket,
    chapter: draft.chapter,
    review: draft.review,
    saveDecision: draft.saveDecision
  };
}
