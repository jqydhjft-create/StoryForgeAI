import { buildStorySkillRequest, type StorySkillRunner } from '../storySkills';
import type { ChapterReviewIssue, ChapterReviewReport } from '../../../shared/types';
import type { StoryPlugin } from './storyPluginTypes';

async function runMappedSkill(runner: StorySkillRunner, skillId: Parameters<typeof buildStorySkillRequest>[0], input: unknown) {
  const response = await runner(buildStorySkillRequest(skillId, JSON.stringify(input, null, 2)));
  return response.output;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isReviewIssue(value: unknown): value is ChapterReviewIssue {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    (value.severity === 'info' || value.severity === 'warning' || value.severity === 'error') &&
    typeof value.message === 'string' &&
    (value.location === undefined || typeof value.location === 'string')
  );
}

function summaryFromLegacyOutput(output: unknown): string {
  if (isRecord(output) && typeof output.summary === 'string' && output.summary.trim().length > 0) {
    return output.summary;
  }
  return 'Legacy review did not include a summary.';
}

function normalizeReviewOutput(output: unknown): ChapterReviewReport {
  const summary = summaryFromLegacyOutput(output);

  if (isRecord(output) && output.status === 'passed') {
    return { status: 'passed', summary, issues: [] };
  }

  if (isRecord(output) && output.status === 'issues_found') {
    const issues = Array.isArray(output.issues) ? output.issues.filter(isReviewIssue) : [];
    return { status: 'issues_found', summary, issues };
  }

  return {
    status: 'issues_found',
    summary,
    issues: [{ id: 'legacy-logic-detective', severity: 'error', message: summary }]
  };
}

export function createBuiltinStoryPlugin(runner: StorySkillRunner): StoryPlugin {
  return {
    id: 'builtin-story-plugin',
    capabilities: {
      write_chapter: (input) => runMappedSkill(runner, 'next-chapter-workshop', input),
      review_chapter: async (input) => normalizeReviewOutput(await runMappedSkill(runner, 'logic-detective', input))
    }
  };
}
