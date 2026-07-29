import type { StoryProject } from '../../shared/types.js';

export type WorkflowNextChapterResolution =
  | {
      status: 'ready';
      actId: string;
      chapterId: number;
      existingChapter: 'none' | 'placeholder';
    }
  | { status: 'conflict'; actId: string; chapterId: number }
  | { status: 'unavailable'; reason: 'missing_outline' | 'complete' };

export function isReplaceableWorkflowPlaceholder(content: string, chapterId: number): boolean {
  const normalized = content.replace(/^\uFEFF/, '').trim();
  if (!normalized) return true;

  return normalized === `# Chapter ${chapterId}` || normalized === `# \u7b2c${chapterId}\u7ae0`;
}

export function resolveNextWorkflowChapter(project: StoryProject): WorkflowNextChapterResolution {
  const acts = project.workflow.artifacts.sceneOutline?.acts;
  if (!acts?.some((act) => act.chapters.length > 0)) {
    return { status: 'unavailable', reason: 'missing_outline' };
  }

  const outlinedChapters = acts
    .flatMap((act) => act.chapters.map((chapter) => ({ actId: act.actId, chapter })))
    .sort((left, right) => left.chapter.chapterId - right.chapter.chapterId);

  for (const { actId, chapter } of outlinedChapters) {
      if (project.workflow.artifacts.chapterReviews?.[chapter.chapterId]) continue;

      const existing = project.chapters.find((item) => item.meta.id === chapter.chapterId);
      if (!existing) {
        return {
          status: 'ready',
          actId,
          chapterId: chapter.chapterId,
          existingChapter: 'none'
        };
      }

      if (isReplaceableWorkflowPlaceholder(existing.content, chapter.chapterId)) {
        return {
          status: 'ready',
          actId,
          chapterId: chapter.chapterId,
          existingChapter: 'placeholder'
        };
      }

      return { status: 'conflict', actId, chapterId: chapter.chapterId };
  }

  return { status: 'unavailable', reason: 'complete' };
}
