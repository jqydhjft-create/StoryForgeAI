import { buildStorySkillRequest, type StorySkillRunner } from '../storySkills';
import type {
  ActScoreReport,
  ActTimeline,
  ChapterReviewIssue,
  ChapterReviewReport,
  InitialSettingBook,
  SceneOutlineArtifact,
  WorldOutlineArtifact
} from '../../../shared/types';
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
      generate_initial_brief: async (input) => toInitialSettingBook(input, await runMappedSkill(runner, 'theme-generator', input)),
      generate_world_and_outline: async (input) => {
        const worldDocument = await runMappedSkill(runner, 'world-generator', input);
        const masterOutline = await runMappedSkill(runner, 'plot-designer', { input, worldDocument });
        return toWorldOutline(worldDocument, masterOutline);
      },
      generate_act_timeline: async (input) => toActTimeline(await runMappedSkill(runner, 'plot-designer', input)),
      generate_scene_outline: async (input) => toSceneOutline(await runMappedSkill(runner, 'plot-designer', input)),
      write_chapter: (input) => runMappedSkill(runner, 'next-chapter-workshop', input),
      review_chapter: async (input) => normalizeReviewOutput(await runMappedSkill(runner, 'logic-detective', input)),
      score_act: async (input) => toActScoreReport(input, await runMappedSkill(runner, 'integrated-gate', input)),
      review_full_text: async (input) => normalizeReviewOutput(await runMappedSkill(runner, 'integrated-gate', input))
    }
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

function plotItems(output: unknown): Array<{ id: string; label: string; summary: string; chapterHint: number }> {
  if (!isRecord(output) || !Array.isArray(output.plot)) return [];
  return output.plot.flatMap((item, index) => {
    if (!isRecord(item)) return [];
    return [
      {
        id: stringValue(item.id, `plot-${index + 1}`),
        label: stringValue(item.label, `Plot ${index + 1}`),
        summary: stringValue(item.summary, ''),
        chapterHint: typeof item.chapterHint === 'number' ? item.chapterHint : index + 1
      }
    ];
  });
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

function toActTimeline(output: unknown): ActTimeline {
  const acts = plotItems(output);
  return {
    acts: (acts.length > 0 ? acts : [{ id: 'act-1', label: 'Act 1', summary: 'Draft act.', chapterHint: 1 }]).map((item) => ({
      id: item.id,
      title: item.label,
      time: `Chapter ${item.chapterHint}`,
      location: '',
      characters: [],
      movement: item.summary,
      summary: item.summary
    }))
  };
}

function toSceneOutline(output: unknown): SceneOutlineArtifact {
  const chapters = (plotItems(output).length > 0 ? plotItems(output) : [{ id: 'chapter-1', label: 'Chapter 1', summary: 'Draft chapter.', chapterHint: 1 }]).map(
    (item) => ({
      id: item.id,
      actId: 'act-1',
      chapterId: item.chapterHint,
      target: item.summary || item.label,
      scenes: [],
      anchors: []
    })
  );

  return {
    acts: [{ actId: 'act-1', summary: chapters.map((chapter) => chapter.target).join('\n'), chapters }]
  };
}

function toActScoreReport(input: unknown, output: unknown): ActScoreReport {
  const rawInput = isRecord(input) ? input : {};
  const rawOutput = isRecord(output) ? output : {};

  return {
    actId: stringValue(rawInput.actId, 'act-1'),
    plotContinuity: 8,
    characterConsistency: 8,
    pacingControl: 8,
    detailRichness: 8,
    comment: stringValue(rawOutput.summary, 'No score comment.')
  };
}
