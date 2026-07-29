import type {
  ChapterReviewIssue,
  ChapterReviewReport,
  InitialSettingBook,
  WorldOutlineArtifact
} from '../../../shared/types';
import { buildStorySkillRequest, type StorySkillRunner } from '../storySkillContracts';
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

function reviewSummary(output: unknown): string {
  if (isRecord(output) && typeof output.summary === 'string' && output.summary.trim().length > 0) {
    return output.summary;
  }
  return 'The review did not include a summary.';
}

function normalizeReviewOutput(output: unknown): ChapterReviewReport {
  const summary = reviewSummary(output);

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
    issues: [{ id: 'skill-review-output', severity: 'error', message: summary }]
  };
}

function stringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function jsonText(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function toInitialSettingBook(input: unknown, output: unknown): InitialSettingBook {
  const rawInput = isRecord(input) ? input : {};
  const rawOutput = isRecord(output) ? output : {};
  const themes = stringArrayValue(rawOutput.themes);

  return {
    genre: stringValue(rawInput.genre, 'Mystery'),
    worldPremise: stringValue(rawInput.worldPremise, stringValue(rawInput.idea, stringValue(rawOutput.title, 'Untitled story'))),
    protagonist: stringValue(rawOutput.protagonist, stringValue(rawInput.protagonist, 'Protagonist')),
    coreConflict: stringValue(rawOutput.conflict, stringValue(rawInput.coreConflict, 'Unresolved conflict')),
    readerFeeling: stringValue(rawInput.readerFeeling, themes[0] ?? 'Curiosity'),
    targetLength: stringValue(rawInput.targetLength, 'Unspecified'),
    requiredElements: stringArrayValue(rawInput.requiredElements)
  };
}

function toWorldOutline(worldOutput: unknown, outlineOutput: unknown): WorldOutlineArtifact {
  return {
    worldDocument: jsonText(worldOutput),
    masterOutline: jsonText(outlineOutput)
  };
}

function characterBible(output: unknown): unknown {
  return isRecord(output) && Array.isArray(output.characters) ? output.characters : output;
}

export function createSkillStoryPlugin(runner: StorySkillRunner): StoryPlugin {
  return {
    id: 'skill-story-plugin',
    capabilities: {
      generate_initial_brief: async (input) => toInitialSettingBook(input, await runMappedSkill(runner, 'theme-generator', input)),
      generate_world_and_outline: async (input) => {
        const worldDocument = await runMappedSkill(runner, 'world-generator', input);
        const masterOutline = await runMappedSkill(runner, 'plot-designer', { input, worldDocument });
        return toWorldOutline(worldDocument, masterOutline);
      },
      generate_characters: async (input) => characterBible(await runMappedSkill(runner, 'character-generator', input)),
      generate_act_timeline: (input) => runMappedSkill(runner, 'act-timeline-generator', input),
      generate_scene_outline: (input) => runMappedSkill(runner, 'scene-outline-generator', input),
      write_chapter: (input) => runMappedSkill(runner, 'chapter-draft-writer', input),
      review_chapter: async (input) => normalizeReviewOutput(await runMappedSkill(runner, 'logic-detective', input)),
      score_act: (input) => runMappedSkill(runner, 'score-act', input),
      review_full_text: async (input) => normalizeReviewOutput(await runMappedSkill(runner, 'integrated-gate', input))
    }
  };
}
