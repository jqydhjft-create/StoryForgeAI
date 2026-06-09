import type { ChapterMeta, ChapterReviewReport, PlotBeat, StoryProject, SummaryData } from '../../shared/types.js';
import { createBuiltinStoryPlugin } from './plugins/builtinStoryPlugin';
import { createStoryPluginRegistry } from './plugins/storyPluginRegistry';
import { createDesktopSkillRunner, type StorySkillRunner } from './storySkills';

export interface NextChapterContextPacket {
  projectName: string;
  nextChapterId: number;
  targetBeat: PlotBeat | null;
  recentChapters: Array<{ id: number; title: string; summary: string }>;
  characterStates: Array<{ name: string; role: string; status: string }>;
  worldRules: string[];
  summary: SummaryData;
  openPlotBeats: PlotBeat[];
}

export interface NextChapterDraft {
  meta: ChapterMeta;
  content: string;
}

export interface NextChapterWorkflowResult {
  contextPacket: NextChapterContextPacket;
  chapter: NextChapterDraft;
  reviewReport: ChapterReviewReport;
  saveDecision: 'ready_to_save' | 'blocked_by_review';
  reviewNotes: string[];
  changeLog: string[];
}

export interface NextChapterWorkflowOptions {
  skillRunner?: StorySkillRunner;
  targetChapterId?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asStringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : null;
}

function summarizeChapter(content: string): string {
  return content
    .replace(/^# .+$/m, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

function findTargetBeat(project: StoryProject, nextChapterId: number): PlotBeat | null {
  return (
    project.plot
      .filter((beat) => beat.chapterHint >= nextChapterId)
      .sort((left, right) => left.chapterHint - right.chapterHint)[0] ??
    project.plot[project.plot.length - 1] ??
    null
  );
}

export function buildNextChapterContextPacket(project: StoryProject, targetChapterId?: number): NextChapterContextPacket {
  const nextChapterId = targetChapterId ?? Math.max(0, ...project.chapters.map((chapter) => chapter.meta.id)) + 1;
  const recentChapters = project.chapters
    .slice()
    .sort((left, right) => left.meta.id - right.meta.id)
    .filter((chapter) => chapter.meta.id < nextChapterId)
    .slice(-2)
    .map((chapter) => ({
      id: chapter.meta.id,
      title: chapter.meta.title,
      summary: summarizeChapter(chapter.content)
    }));

  return {
    projectName: project.settings.name,
    nextChapterId,
    targetBeat: findTargetBeat(project, nextChapterId),
    recentChapters,
    characterStates: project.characters.map((character) => ({
      name: character.name,
      role: character.role,
      status: character.arc || character.motivation || '状态未更新'
    })),
    worldRules: project.world.rules,
    summary: project.summary,
    openPlotBeats: project.plot.filter((beat) => beat.chapterHint >= nextChapterId)
  };
}

function asNextChapterDraft(value: unknown): NextChapterDraft | null {
  const rawChapter = isRecord(value) && isRecord(value.chapter) ? value.chapter : value;
  if (!isRecord(rawChapter) || !isRecord(rawChapter.meta) || typeof rawChapter.content !== 'string') return null;

  const characters = asStringArray(rawChapter.meta.characters);
  const locations = asStringArray(rawChapter.meta.locations);
  if (
    typeof rawChapter.meta.id === 'number' &&
    typeof rawChapter.meta.title === 'string' &&
    typeof rawChapter.meta.sceneCount === 'number' &&
    characters &&
    locations &&
    typeof rawChapter.meta.timelineDay === 'number'
  ) {
    return {
      meta: {
        id: rawChapter.meta.id,
        title: rawChapter.meta.title,
        sceneCount: rawChapter.meta.sceneCount,
        characters,
        locations,
        timelineDay: rawChapter.meta.timelineDay
      },
      content: rawChapter.content
    };
  }

  return null;
}

function asReviewNotes(value: unknown): string[] {
  if (!isRecord(value)) return [];
  return asStringArray(value.reviewNotes) ?? [];
}

function isReviewReport(value: unknown): value is ChapterReviewReport {
  if (!isRecord(value)) return false;
  if (value.status !== 'passed' && value.status !== 'issues_found') return false;
  if (typeof value.summary !== 'string' || !Array.isArray(value.issues)) return false;
  return value.issues.every(
    (issue) =>
      isRecord(issue) &&
      typeof issue.id === 'string' &&
      (issue.severity === 'info' || issue.severity === 'warning' || issue.severity === 'error') &&
      typeof issue.message === 'string' &&
      (issue.location === undefined || typeof issue.location === 'string')
  );
}

function fallbackReview(summary: string): ChapterReviewReport {
  return {
    status: 'issues_found',
    summary,
    issues: [{ id: 'next-chapter-review-unavailable', severity: 'warning', message: summary }]
  };
}

function localFallbackReview(): ChapterReviewReport {
  return {
    status: 'passed',
    summary: '本地兜底草稿已生成，未运行外部审核。',
    issues: []
  };
}

function buildFallbackChapter(packet: NextChapterContextPacket): NextChapterDraft {
  const protagonist = packet.characterStates[0]?.name ?? '主角';
  const companion = packet.characterStates[1]?.name ?? '同行者';
  const targetLabel = packet.targetBeat?.label ?? `第 ${packet.nextChapterId} 章推进`;
  const targetSummary = packet.targetBeat?.summary ?? '新的线索把人物推向下一处选择。';
  const title = `第${packet.nextChapterId}章：${targetLabel}`;

  return {
    meta: {
      id: packet.nextChapterId,
      title,
      sceneCount: 2,
      characters: [protagonist, companion].filter(Boolean),
      locations: ['路边营地'],
      timelineDay: packet.nextChapterId
    },
    content: `# ${title}\n\n${protagonist}带着${companion}离开上一章的余波，${targetSummary}\n\n他们必须在安全和真相之间做出新的选择。`
  };
}

function providerLabel(provider: 'openai' | 'deepseek' | 'mock'): string {
  return provider === 'openai' ? 'OpenAI' : provider === 'deepseek' ? 'DeepSeek' : 'Mock';
}

export async function runNextChapterWorkflow(
  project: StoryProject,
  options: NextChapterWorkflowOptions = {}
): Promise<NextChapterWorkflowResult> {
  const contextPacket = buildNextChapterContextPacket(project, options.targetChapterId);
  const changeLog: string[] = [];
  const skillRunner = options.skillRunner ?? createDesktopSkillRunner();

  if (!skillRunner) {
    changeLog.push('Skill next-chapter-workshop 使用 mock：未配置模型 runner');
    return {
      contextPacket,
      chapter: buildFallbackChapter(contextPacket),
      reviewReport: localFallbackReview(),
      saveDecision: 'ready_to_save',
      reviewNotes: ['使用本地上下文包生成下一章草稿'],
      changeLog
    };
  }

  try {
    const loggedRunner: StorySkillRunner = async (request) => {
      const response = await skillRunner(request);
      changeLog.push(`${providerLabel(response.provider)} Skill ${request.skillId} 已应用`);
      return response;
    };
    const registry = createStoryPluginRegistry([createBuiltinStoryPlugin(loggedRunner)]);
    const writeOutput = await registry.invoke<NextChapterContextPacket, unknown>('write_chapter', contextPacket);
    const chapter = asNextChapterDraft(writeOutput);
    if (chapter) {
      let reviewReport: ChapterReviewReport;
      try {
        const reviewOutput = await registry.invoke<{ contextPacket: NextChapterContextPacket; chapter: NextChapterDraft }, unknown>(
          'review_chapter',
          { contextPacket, chapter }
        );
        reviewReport = isReviewReport(reviewOutput)
          ? reviewOutput
          : fallbackReview('review_chapter did not return a valid review report');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown review error';
        changeLog.push(`Skill logic-detective 回落到 blocked review：${message}`);
        reviewReport = fallbackReview(message);
      }

      return {
        contextPacket,
        chapter,
        reviewReport,
        saveDecision: reviewReport.status === 'passed' ? 'ready_to_save' : 'blocked_by_review',
        reviewNotes: [
          ...asReviewNotes(writeOutput),
          reviewReport.summary,
          ...reviewReport.issues.map((issue) => issue.message)
        ],
        changeLog
      };
    }

    changeLog.push('Skill next-chapter-workshop 回落到 mock：输出结构不符合 schema');
  } catch (error) {
    changeLog.push(`Skill next-chapter-workshop 回落到 mock：${error instanceof Error ? error.message : '未知错误'}`);
  }

  return {
    contextPacket,
    chapter: buildFallbackChapter(contextPacket),
    reviewReport: localFallbackReview(),
    saveDecision: 'ready_to_save',
    reviewNotes: ['模型输出不可用，已使用本地上下文包生成草稿'],
    changeLog
  };
}
