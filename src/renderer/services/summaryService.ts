import type { ChapterMeta, SummaryData } from '../../shared/types.js';
import { buildStorySkillRequest, createDesktopSkillRunner, type StorySkillRunner } from './storySkills';

type ChapterInput = { meta: ChapterMeta; content: string };
const summaryContentPreviewLimit = 500;

export interface SummaryWorkflowOptions {
  skillRunner?: StorySkillRunner;
}

export interface SummaryWorkflowResult {
  summary: SummaryData;
  changeLog: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asTimeline(value: unknown): SummaryData['timeline'] | null {
  if (!Array.isArray(value)) return null;
  const timeline = value.filter((item): item is SummaryData['timeline'][number] => {
    return isRecord(item) && typeof item.event === 'string' && typeof item.time === 'string' && typeof item.chapter === 'number';
  });
  return timeline.length > 0 ? timeline : null;
}

function asLocations(value: unknown): SummaryData['locations'] | null {
  if (!Array.isArray(value)) return null;
  const locations = value.filter((item): item is SummaryData['locations'][number] => {
    return (
      isRecord(item) &&
      typeof item.name === 'string' &&
      typeof item.firstAppearance === 'string' &&
      Array.isArray(item.scenes) &&
      item.scenes.every((scene) => typeof scene === 'string')
    );
  });
  return locations.length > 0 ? locations : null;
}

function asCharacters(value: unknown): SummaryData['characters'] | null {
  if (!Array.isArray(value)) return null;
  const characters = value.filter((item): item is SummaryData['characters'][number] => {
    return (
      isRecord(item) &&
      typeof item.name === 'string' &&
      typeof item.firstChapter === 'number' &&
      typeof item.lastChapter === 'number' &&
      typeof item.statusChange === 'string'
    );
  });
  return characters.length > 0 ? characters : null;
}

function asSummaryData(value: unknown): SummaryData | null {
  if (!isRecord(value)) return null;
  const timeline = asTimeline(value.timeline);
  const locations = asLocations(value.locations);
  const characters = asCharacters(value.characters);
  return timeline && locations && characters ? { timeline, locations, characters } : null;
}

function contentPreview(content: string): string {
  return content.replace(/\s+/g, ' ').trim().slice(0, summaryContentPreviewLimit);
}

function buildSummarySkillInput(chapters: ChapterInput[]) {
  return {
    chapters: chapters.map((chapter) => ({
      meta: chapter.meta,
      contentPreview: contentPreview(chapter.content)
    }))
  };
}

export function buildSummary(chapters: ChapterInput[]): SummaryData {
  const locations = new Map<string, { name: string; firstAppearance: string; scenes: string[] }>();
  const characters = new Map<string, { name: string; firstChapter: number; lastChapter: number; statusChange: string }>();

  for (const chapter of chapters) {
    for (const location of chapter.meta.locations) {
      const existing = locations.get(location);
      const sceneLabel = `Chapter ${chapter.meta.id}`;

      if (existing) {
        existing.scenes.push(sceneLabel);
      } else {
        locations.set(location, { name: location, firstAppearance: sceneLabel, scenes: [sceneLabel] });
      }
    }

    for (const character of chapter.meta.characters) {
      const existing = characters.get(character);

      if (existing) {
        existing.lastChapter = chapter.meta.id;
      } else {
        characters.set(character, {
          name: character,
          firstChapter: chapter.meta.id,
          lastChapter: chapter.meta.id,
          statusChange: 'Introduced'
        });
      }
    }
  }

  return {
    timeline: chapters.map((chapter) => ({
      event: chapter.meta.title,
      time: `Day ${chapter.meta.timelineDay}`,
      chapter: chapter.meta.id
    })),
    locations: Array.from(locations.values()),
    characters: Array.from(characters.values())
  };
}

export function upsertChapterSummary(summary: SummaryData, chapter: ChapterInput): SummaryData {
  const sceneLabel = `Chapter ${chapter.meta.id}`;
  const timeline = [
    ...summary.timeline.filter((item) => item.chapter !== chapter.meta.id),
    { event: chapter.meta.title, time: `Day ${chapter.meta.timelineDay}`, chapter: chapter.meta.id }
  ].sort((left, right) => left.chapter - right.chapter);

  const locations = summary.locations
    .map((location) => ({
      ...location,
      scenes: location.scenes.filter((scene) => scene !== sceneLabel)
    }))
    .filter((location) => location.scenes.length > 0);

  for (const locationName of chapter.meta.locations) {
    const existing = locations.find((location) => location.name === locationName);
    if (existing) {
      if (!existing.scenes.includes(sceneLabel)) {
        existing.scenes.push(sceneLabel);
      }
    } else {
      locations.push({ name: locationName, firstAppearance: sceneLabel, scenes: [sceneLabel] });
    }
  }

  const characters = summary.characters.map((character) => ({ ...character }));
  for (const characterName of chapter.meta.characters) {
    const existing = characters.find((character) => character.name === characterName);
    if (existing) {
      existing.firstChapter = Math.min(existing.firstChapter, chapter.meta.id);
      existing.lastChapter = Math.max(existing.lastChapter, chapter.meta.id);
    } else {
      characters.push({
        name: characterName,
        firstChapter: chapter.meta.id,
        lastChapter: chapter.meta.id,
        statusChange: 'Introduced'
      });
    }
  }

  return { timeline, locations, characters };
}

export async function runSummaryWorkflow(
  chapters: ChapterInput[],
  options: SummaryWorkflowOptions = {}
): Promise<SummaryWorkflowResult> {
  const changeLog: string[] = [];
  const fallback = buildSummary(chapters);
  const skillRunner = options.skillRunner ?? createDesktopSkillRunner();

  if (!skillRunner) {
    changeLog.push('Skill summary-ai 使用 mock：未配置模型 runner');
    return { summary: fallback, changeLog };
  }

  try {
    const response = await skillRunner(
      buildStorySkillRequest(
        'summary-ai',
        JSON.stringify(buildSummarySkillInput(chapters), null, 2)
      )
    );
    const summary = asSummaryData(response.output);
    if (!summary) {
      changeLog.push('Skill summary-ai 回落到 mock：模型返回结构不完整');
      return { summary: fallback, changeLog };
    }

    const providerLabel = response.provider === 'openai' ? 'OpenAI' : response.provider === 'deepseek' ? 'DeepSeek' : 'Mock';
    changeLog.push(`${providerLabel} Skill summary-ai 已应用`);
    return { summary, changeLog };
  } catch (error) {
    changeLog.push(`Skill summary-ai 回落到 mock：${error instanceof Error ? error.message : '未知错误'}`);
    return { summary: fallback, changeLog };
  }
}
