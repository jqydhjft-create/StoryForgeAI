import type { StorySkillId } from '../../shared/types.js';
import type { StorySeed } from './mockAiService';
import { buildStorySkillRequest, type StorySkillRunner } from './storySkills';
import type { InitialChapterDraft, WorkflowGateReport } from './storyWorkflow';

type ReviewSkillId = Extract<
  StorySkillId,
  'theme-review' | 'character-review' | 'plot-review' | 'world-review' | 'logic-detective' | 'integrated-gate'
>;

interface ReviewAgentInput {
  idea: string;
  seed: StorySeed;
  initialChapter: InitialChapterDraft;
}

export interface ReviewAgentResult {
  reports: WorkflowGateReport[];
  overall: WorkflowGateReport;
  changeLog: string[];
}

const reviewOrder: ReviewSkillId[] = [
  'theme-review',
  'character-review',
  'plot-review',
  'world-review',
  'logic-detective',
  'integrated-gate'
];

const fallbackReports: Record<ReviewSkillId, WorkflowGateReport> = {
  'theme-review': {
    id: 'theme-review',
    label: '主题审查',
    status: 'passed',
    summary: '主题声明与故事目标、核心冲突一致。'
  },
  'character-review': {
    id: 'character-review',
    label: '人物审查',
    status: 'passed',
    summary: '人物动机、缺陷与成长弧线可以支撑当前故事。'
  },
  'plot-review': {
    id: 'plot-review',
    label: '情节审查',
    status: 'passed',
    summary: '情节点具备开端、推进、转折、考验和结局。'
  },
  'world-review': {
    id: 'world-review',
    label: '世界观审查',
    status: 'passed',
    summary: '世界规则、术语和故事前提没有明显冲突。'
  },
  'logic-detective': {
    id: 'logic-detective',
    label: '逻辑侦探',
    status: 'passed',
    summary: '当前起始资产没有发现时间线或因果断裂。'
  },
  'integrated-gate': {
    id: 'integrated-gate',
    label: '综合门禁',
    status: 'passed',
    summary: '所有质量门禁通过，可以写入核心资产层。'
  }
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asReviewReport(skillId: ReviewSkillId, output: unknown): WorkflowGateReport {
  const fallback = fallbackReports[skillId];
  if (!isRecord(output)) return fallback;

  return {
    id: skillId,
    label: fallback.label,
    status: output.status === 'failed' ? 'failed' : 'passed',
    summary: typeof output.summary === 'string' ? output.summary : fallback.summary,
    retryTarget:
      output.retryTarget === 'theme-generator' ||
      output.retryTarget === 'world-generator' ||
      output.retryTarget === 'character-generator' ||
      output.retryTarget === 'plot-designer' ||
      output.retryTarget === 'scene-writing-workshop'
        ? output.retryTarget
        : undefined
  };
}

function buildReviewPrompt(input: ReviewAgentInput, previousReports: WorkflowGateReport[]): string {
  return JSON.stringify(
    {
      idea: input.idea,
      seed: input.seed,
      initialChapter: input.initialChapter,
      previousReports
    },
    null,
    2
  );
}

function summarizeOverall(reports: WorkflowGateReport[]): WorkflowGateReport {
  const failed = reports.find((report) => report.status === 'failed');
  if (!failed) return reports[reports.length - 1] ?? fallbackReports['integrated-gate'];

  return {
    id: 'integrated-gate',
    label: '综合门禁',
    status: 'failed',
    summary: `需要先修正：${failed.label}。${failed.summary}`,
    retryTarget: failed.retryTarget
  };
}

export async function runReviewAgent(input: ReviewAgentInput, skillRunner?: StorySkillRunner): Promise<ReviewAgentResult> {
  const reports: WorkflowGateReport[] = [];
  const changeLog: string[] = [];

  for (const skillId of reviewOrder) {
    changeLog.push(`审查 Agent 加载 ${skillId} Skill`);
    if (!skillRunner) {
      reports.push(fallbackReports[skillId]);
      continue;
    }

    try {
      const response = await skillRunner(buildStorySkillRequest(skillId, buildReviewPrompt(input, reports)));
      reports.push(asReviewReport(skillId, response.output));
    } catch (error) {
      changeLog.push(`审查 Skill ${skillId} 回落到 mock：${error instanceof Error ? error.message : '未知错误'}`);
      reports.push(fallbackReports[skillId]);
    }
  }

  return {
    reports,
    overall: summarizeOverall(reports),
    changeLog
  };
}
