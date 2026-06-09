import type { ChapterContextPacket, ChapterReviewReport } from '../../shared/types.js';
import type { StoryPluginRegistry } from './plugins/storyPluginTypes';

export type DraftSaveDecision = 'ready_to_save' | 'blocked_by_review';

export interface ReviewedChapterDraft {
  status: 'reviewed';
  chapter: unknown;
  review: ChapterReviewReport;
  saveDecision: DraftSaveDecision;
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
  const draft = await registry.invoke<ChapterContextPacket, { chapter: unknown }>('write_chapter', contextPacket);
  const review = await registry.invoke<{ contextPacket: ChapterContextPacket; chapter: unknown }, ChapterReviewReport>('review_chapter', {
    contextPacket,
    chapter: draft.chapter
  });

  return {
    status: 'reviewed',
    chapter: draft.chapter,
    review,
    saveDecision: review.status === 'passed' ? 'ready_to_save' : 'blocked_by_review'
  };
}
