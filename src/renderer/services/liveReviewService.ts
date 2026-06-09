import type { StoryProject } from '../../shared/types.js';

export type LiveReviewWarningCode = 'missing-chapter' | 'duplicate-title' | 'repeated-opening';

export interface LiveReviewWarning {
  code: LiveReviewWarningCode;
  message: string;
  chapterId?: number;
}

function normalizeOpening(content: string): string {
  return content
    .replace(/^# .+$/m, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '')
    .toLowerCase();
}

export async function runLightReview(project: StoryProject): Promise<LiveReviewWarning[]> {
  const warnings: LiveReviewWarning[] = [];
  const chapters = project.chapters.slice().sort((left, right) => left.meta.id - right.meta.id);
  const ids = new Set(chapters.map((chapter) => chapter.meta.id));
  const maxId = Math.max(0, ...chapters.map((chapter) => chapter.meta.id));

  for (let id = 1; id <= maxId; id += 1) {
    if (!ids.has(id)) {
      warnings.push({ code: 'missing-chapter', message: `Chapter ${id} is missing.`, chapterId: id });
    }
  }

  const titleCounts = new Map<string, number>();
  for (const chapter of chapters) {
    const title = chapter.meta.title.trim().toLowerCase();
    titleCounts.set(title, (titleCounts.get(title) ?? 0) + 1);
  }
  for (const chapter of chapters) {
    if ((titleCounts.get(chapter.meta.title.trim().toLowerCase()) ?? 0) > 1) {
      warnings.push({ code: 'duplicate-title', message: `Duplicate chapter title: ${chapter.meta.title}.`, chapterId: chapter.meta.id });
      break;
    }
  }

  const openings = new Map<string, number>();
  for (const chapter of chapters) {
    const opening = normalizeOpening(chapter.content).slice(0, 48);
    if (opening.length < 20) continue;
    const repeated = Array.from(openings.keys()).some((existing) => existing.startsWith(opening) || opening.startsWith(existing));
    if (repeated) {
      warnings.push({
        code: 'repeated-opening',
        message: `Chapter ${chapter.meta.id} repeats an earlier opening pattern.`,
        chapterId: chapter.meta.id
      });
      break;
    }
    openings.set(opening, chapter.meta.id);
  }

  return warnings;
}
