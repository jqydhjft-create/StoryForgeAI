import type {
  ActScoreReport,
  ActTimeline,
  ChapterReviewIssue,
  ChapterReviewReport,
  InitialSettingBook,
  SceneOutlineArtifact,
  WorkflowStageId,
  WorldOutlineArtifact
} from '../../shared/types.js';
import type { StoryPluginRegistry } from './plugins/storyPluginTypes';
import {
  normalizeActScoreReport,
  normalizeActTimeline,
  normalizeInitialSettingBook,
  normalizeSceneOutline,
  normalizeWorldOutline
} from './workflowArtifacts';

interface WorkflowStageArtifactMap {
  intake: InitialSettingBook;
  world_outline: WorldOutlineArtifact;
  act_timeline: ActTimeline;
  scene_outline: SceneOutlineArtifact;
  chapter_draft: never;
  act_scoring: ActScoreReport;
  full_review: ChapterReviewReport;
}

type GeneratableWorkflowStage = Exclude<WorkflowStageId, 'chapter_draft'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeReviewIssue(value: unknown): ChapterReviewIssue | null {
  if (!isRecord(value)) {
    return null;
  }

  const { id, severity, message, location } = value;
  if (
    typeof id !== 'string' ||
    (severity !== 'info' && severity !== 'warning' && severity !== 'error') ||
    typeof message !== 'string'
  ) {
    return null;
  }

  if (location !== undefined && typeof location !== 'string') {
    return null;
  }

  return {
    id,
    severity,
    message,
    ...(location !== undefined ? { location } : {})
  };
}

function normalizeChapterReviewReport(value: unknown): ChapterReviewReport {
  if (!isRecord(value) || (value.status !== 'passed' && value.status !== 'issues_found')) {
    throw new Error('Invalid chapter review');
  }

  if (typeof value.summary !== 'string' || !Array.isArray(value.issues)) {
    throw new Error('Invalid chapter review');
  }

  const issues = value.issues.map(normalizeReviewIssue);
  if (issues.some((issue) => issue === null)) {
    throw new Error('Invalid chapter review');
  }

  return {
    status: value.status,
    summary: value.summary,
    issues: issues as ChapterReviewIssue[]
  };
}

export async function generateStageArtifact<Stage extends GeneratableWorkflowStage>(
  registry: StoryPluginRegistry,
  stage: Stage,
  input: unknown
): Promise<WorkflowStageArtifactMap[Stage]>;
export async function generateStageArtifact(
  registry: StoryPluginRegistry,
  stage: 'chapter_draft',
  input: unknown
): Promise<never>;
export async function generateStageArtifact(
  registry: StoryPluginRegistry,
  stage: WorkflowStageId,
  input: unknown
): Promise<WorkflowStageArtifactMap[GeneratableWorkflowStage]>;
export async function generateStageArtifact(
  registry: StoryPluginRegistry,
  stage: WorkflowStageId,
  input: unknown
): Promise<WorkflowStageArtifactMap[GeneratableWorkflowStage]> {
  switch (stage) {
    case 'intake':
      return normalizeInitialSettingBook(await registry.invoke('generate_initial_brief', input));
    case 'world_outline':
      return normalizeWorldOutline(await registry.invoke('generate_world_and_outline', input));
    case 'act_timeline':
      return normalizeActTimeline(await registry.invoke('generate_act_timeline', input));
    case 'scene_outline':
      return normalizeSceneOutline(await registry.invoke('generate_scene_outline', input));
    case 'act_scoring':
      return normalizeActScoreReport(await registry.invoke('score_act', input));
    case 'full_review':
      return normalizeChapterReviewReport(await registry.invoke('review_full_text', input));
    case 'chapter_draft':
      throw new Error('Chapter draft uses workflowChapterLoop');
    default:
      throw new Error(`Unsupported workflow stage ${stage}`);
  }
}
