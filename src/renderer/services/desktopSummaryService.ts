import type { ChapterMeta } from '../../shared/types.js';
import { createDesktopSkillRunner } from './desktopSkillRunner.js';
import { runSummaryWorkflow } from './summaryService.js';

/** Electron-only convenience entrypoint for AI-assisted summary generation. */
export function runDesktopSummaryWorkflow(chapters: Array<{ meta: ChapterMeta; content: string }>) {
  return runSummaryWorkflow(chapters, { skillRunner: createDesktopSkillRunner() });
}
