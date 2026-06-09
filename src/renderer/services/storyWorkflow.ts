import type {
  ChapterMeta,
  CharacterProfile,
  PlotBeat,
  StoryConcept,
  WorldBible
} from '../../shared/types.js';
import { generateStorySeed, type StorySeed } from './mockAiService';
import { runReviewAgent } from './reviewAgent';
import { buildStorySkillRequest, createDesktopSkillRunner, type StorySkillRunner } from './storySkills';

export type WorkflowGateId =
  | 'theme-review'
  | 'character-review'
  | 'plot-review'
  | 'world-review'
  | 'logic-detective'
  | 'integrated-gate';

export type WorkflowGateStatus = 'passed' | 'failed';

export interface WorkflowGateReport {
  id: WorkflowGateId;
  label: string;
  status: WorkflowGateStatus;
  summary: string;
  retryTarget?: 'theme-generator' | 'world-generator' | 'character-generator' | 'plot-designer' | 'scene-writing-workshop';
}

export interface StoryWorkflowInput {
  idea: string;
}

export interface StoryWorkflowOptions {
  skillRunner?: StorySkillRunner;
}

export interface InitialChapterDraft {
  meta: ChapterMeta;
  content: string;
}

export interface StoryWorkflowResult {
  idea: string;
  seed: StorySeed;
  initialChapter: InitialChapterDraft;
  gateReports: WorkflowGateReport[];
  contextDigest: string;
  changeLog: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : null;
}

function asConcept(value: unknown): StoryConcept | null {
  if (!isRecord(value)) return null;
  const themes = asStringArray(value.themes);
  if (
    typeof value.title === 'string' &&
    typeof value.protagonist === 'string' &&
    typeof value.goal === 'string' &&
    typeof value.conflict === 'string' &&
    themes
  ) {
    return {
      title: value.title,
      protagonist: value.protagonist,
      goal: value.goal,
      conflict: value.conflict,
      themes
    };
  }
  return null;
}

function asWorld(value: unknown): WorldBible | null {
  if (!isRecord(value)) return null;
  const rules = asStringArray(value.rules);
  if (typeof value.genre === 'string' && typeof value.premise === 'string' && rules && isRecord(value.terms)) {
    const terms = Object.fromEntries(
      Object.entries(value.terms).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
    );
    return { genre: value.genre, premise: value.premise, rules, terms };
  }
  return null;
}

function asCharacters(value: unknown): CharacterProfile[] | null {
  const rawCharacters = isRecord(value) ? value.characters : value;
  if (!Array.isArray(rawCharacters)) return null;
  const characters = rawCharacters.filter((item): item is CharacterProfile => {
    return (
      isRecord(item) &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.role === 'string' &&
      typeof item.motivation === 'string' &&
      typeof item.flaw === 'string' &&
      typeof item.arc === 'string'
    );
  });
  return characters.length > 0 ? characters : null;
}

function asPlot(value: unknown): PlotBeat[] | null {
  const rawPlot = isRecord(value) ? value.plot : value;
  if (!Array.isArray(rawPlot)) return null;
  const plot = rawPlot.filter((item): item is PlotBeat => {
    return (
      isRecord(item) &&
      typeof item.id === 'string' &&
      typeof item.label === 'string' &&
      typeof item.summary === 'string' &&
      typeof item.chapterHint === 'number'
    );
  });
  return plot.length > 0 ? plot : null;
}

function asInitialChapter(value: unknown): InitialChapterDraft | null {
  if (!isRecord(value) || !isRecord(value.meta) || typeof value.content !== 'string') return null;
  const characters = asStringArray(value.meta.characters);
  const locations = asStringArray(value.meta.locations);
  if (
    typeof value.meta.id === 'number' &&
    typeof value.meta.title === 'string' &&
    typeof value.meta.sceneCount === 'number' &&
    characters &&
    locations &&
    typeof value.meta.timelineDay === 'number'
  ) {
    return {
      meta: {
        id: value.meta.id,
        title: value.meta.title,
        sceneCount: value.meta.sceneCount,
        characters,
        locations,
        timelineDay: value.meta.timelineDay
      },
      content: value.content
    };
  }
  return null;
}

function buildInitialChapterDraft(seed: StorySeed): InitialChapterDraft {
  const protagonist = seed.characters[0]?.name ?? '主角';
  const companion = seed.characters[1]?.name ?? '同行者';
  const location = '废弃礼拜堂';

  return {
    meta: {
      id: 1,
      title: '第一章',
      sceneCount: 1,
      characters: [protagonist, companion],
      locations: [location],
      timelineDay: 1
    },
    content: `# 第一章\n\n黎明时分，${protagonist}在一座${location}里发现了${companion}。`
  };
}

function buildGenerationPrompt(idea: string, seed: Partial<StorySeed>, initialChapter?: InitialChapterDraft): string {
  return JSON.stringify({ idea, seed, initialChapter }, null, 2);
}

async function tryRunSkill(
  skillRunner: StorySkillRunner | undefined,
  skillId: 'theme-generator' | 'world-generator' | 'character-generator' | 'plot-designer' | 'scene-writing-workshop',
  userPrompt: string,
  changeLog: string[]
) {
  if (!skillRunner) {
    changeLog.push(`Skill ${skillId} 使用 mock：未配置模型 runner`);
    return undefined;
  }

  try {
    const response = await skillRunner(buildStorySkillRequest(skillId, userPrompt));
    const providerLabel = response.provider === 'openai' ? 'OpenAI' : response.provider === 'deepseek' ? 'DeepSeek' : 'Mock';
    changeLog.push(`${providerLabel} Skill ${skillId} 已应用`);
    return response.output;
  } catch (error) {
    changeLog.push(`Skill ${skillId} 回落到 mock：${error instanceof Error ? error.message : '未知错误'}`);
    return undefined;
  }
}

export async function runStoryWorkflow(
  input: StoryWorkflowInput,
  options: StoryWorkflowOptions = {}
): Promise<StoryWorkflowResult> {
  const mockSeed = generateStorySeed(input.idea);
  const changeLog: string[] = [];
  const skillRunner = options.skillRunner ?? createDesktopSkillRunner();

  let concept =
    asConcept(await tryRunSkill(skillRunner, 'theme-generator', buildGenerationPrompt(input.idea, {}, undefined), changeLog)) ??
    mockSeed.concept;
  let world =
    asWorld(
      await tryRunSkill(skillRunner, 'world-generator', buildGenerationPrompt(input.idea, { concept }, undefined), changeLog)
    ) ?? mockSeed.world;
  let characters =
    asCharacters(
      await tryRunSkill(skillRunner, 'character-generator', buildGenerationPrompt(input.idea, { concept, world }, undefined), changeLog)
    ) ?? mockSeed.characters;
  let plot =
    asPlot(
      await tryRunSkill(
        skillRunner,
        'plot-designer',
        buildGenerationPrompt(input.idea, { concept, world, characters }, undefined),
        changeLog
      )
    ) ?? mockSeed.plot;

  let seed: StorySeed = { concept, world, characters, plot };
  let initialChapter =
    asInitialChapter(
      await tryRunSkill(skillRunner, 'scene-writing-workshop', buildGenerationPrompt(input.idea, seed, undefined), changeLog)
    ) ?? buildInitialChapterDraft(seed);

  let review = await runReviewAgent({ idea: input.idea, seed, initialChapter }, skillRunner);
  changeLog.push(...review.changeLog);

  const failedGate = review.reports.find((report) => report.status === 'failed' && report.retryTarget);
  if (failedGate?.retryTarget && skillRunner) {
    changeLog.push(`审查门禁 ${failedGate.id} 未通过，重试 ${failedGate.retryTarget}`);

    if (failedGate.retryTarget === 'theme-generator') {
      concept =
        asConcept(
          await tryRunSkill(skillRunner, 'theme-generator', buildGenerationPrompt(input.idea, seed, initialChapter), changeLog)
        ) ?? concept;
    }

    if (failedGate.retryTarget === 'world-generator') {
      world =
        asWorld(
          await tryRunSkill(skillRunner, 'world-generator', buildGenerationPrompt(input.idea, { concept }, initialChapter), changeLog)
        ) ?? world;
    }

    if (failedGate.retryTarget === 'character-generator') {
      characters =
        asCharacters(
          await tryRunSkill(
            skillRunner,
            'character-generator',
            buildGenerationPrompt(input.idea, { concept, world }, initialChapter),
            changeLog
          )
        ) ?? characters;
    }

    if (failedGate.retryTarget === 'plot-designer') {
      plot =
        asPlot(
          await tryRunSkill(
            skillRunner,
            'plot-designer',
            buildGenerationPrompt(input.idea, { concept, world, characters }, initialChapter),
            changeLog
          )
        ) ?? plot;
    }

    seed = { concept, world, characters, plot };

    if (failedGate.retryTarget === 'scene-writing-workshop') {
      initialChapter =
        asInitialChapter(
          await tryRunSkill(skillRunner, 'scene-writing-workshop', buildGenerationPrompt(input.idea, seed, initialChapter), changeLog)
        ) ?? initialChapter;
    }

    review = await runReviewAgent({ idea: input.idea, seed, initialChapter }, skillRunner);
    changeLog.push(...review.changeLog);
  }

  changeLog.push('编排器完成起始故事资产生成');

  return {
    idea: input.idea,
    seed,
    initialChapter,
    gateReports: review.reports,
    contextDigest: `世界观圣经、人物档案库、情节蓝图和主题声明已围绕《${seed.concept.title}》建立。`,
    changeLog
  };
}
