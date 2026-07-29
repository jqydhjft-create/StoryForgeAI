import type { ChapterContextPacket, ChapterReviewReport } from '../../shared/types.js';
import type { StoryPluginRegistry } from './plugins/storyPluginTypes';

export type DraftSaveDecision = 'ready_to_save' | 'blocked_by_review';

export interface ReviewedChapterDraft {
  status: 'reviewed';
  chapter: unknown;
  review: ChapterReviewReport;
  saveDecision: DraftSaveDecision;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidReviewIssue(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const hasValidLocation = value.location === undefined || typeof value.location === 'string';
  return (
    typeof value.id === 'string' &&
    (value.severity === 'info' || value.severity === 'warning' || value.severity === 'error') &&
    typeof value.message === 'string' &&
    hasValidLocation
  );
}

function validateWriteResult(value: unknown, expectedChapterId: number): { chapter: unknown } {
  if (!isRecord(value) || !('chapter' in value)) {
    throw new Error('write_chapter did not return a chapter');
  }

  const chapter = value.chapter;
  const meta = isRecord(chapter) && isRecord(chapter.meta) ? chapter.meta : undefined;
  if (typeof meta?.id !== 'number') {
    throw new Error(`write_chapter did not return a valid chapter ID for chapter ${expectedChapterId}`);
  }
  if (meta.id !== expectedChapterId) {
    throw new Error(`write_chapter returned chapter ${meta.id}, expected ${expectedChapterId}`);
  }
  return { chapter };
}

function validateReviewReport(value: unknown): ChapterReviewReport {
  if (
    !isRecord(value) ||
    (value.status !== 'passed' && value.status !== 'issues_found') ||
    typeof value.summary !== 'string' ||
    !Array.isArray(value.issues) ||
    !value.issues.every(isValidReviewIssue)
  ) {
    throw new Error('review_chapter did not return a valid review report');
  }

  return value as unknown as ChapterReviewReport;
}

export function confirmDraftSave(review: ChapterReviewReport) {
  if (review.status === 'passed') {
    return { allowed: true, reason: 'review_passed' as const };
  }
  return { allowed: false, reason: 'review_has_issues' as const };
}

export function forceSaveDraftAfterWarning(input: { secondConfirmation: boolean }) {
  if (!input.secondConfirmation) {
    return { allowed: false, reason: 'second_confirmation_required' as const };
  }
  return { allowed: true, reason: 'user_overrode_review' as const };
}

export async function generateReviewedChapterDraft(
  registry: StoryPluginRegistry,
  contextPacket: ChapterContextPacket
): Promise<ReviewedChapterDraft> {
  const draft = validateWriteResult(
    await registry.invoke<ChapterContextPacket, unknown>('write_chapter', contextPacket),
    contextPacket.chapterId
  );
  const review = validateReviewReport(await registry.invoke<{ contextPacket: ChapterContextPacket; chapter: unknown }, unknown>('review_chapter', {
    contextPacket,
    chapter: draft.chapter
  }));

  return {
    status: 'reviewed',
    chapter: draft.chapter,
    review,
    saveDecision: review.status === 'passed' ? 'ready_to_save' : 'blocked_by_review'
  };
}
