import type {
  ActScoreReport,
  ChapterReviewReport,
  ProjectFileWrite,
  StoryProject,
  StoryWorkflowArtifacts,
  StoryWorkflowState,
  WorkflowStageId
} from '../../shared/types.js';
import { confirmWorkflowStage, requestStageRegeneration } from './workflowCore';

export interface WorkflowProjectMutation {
  project: StoryProject;
  files: ProjectFileWrite[];
}

const orderedRequiredStages: WorkflowStageId[] = [
  'intake',
  'world_outline',
  'character_bible',
  'act_timeline',
  'scene_outline',
  'chapter_draft',
  'act_scoring',
  'full_review'
];

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function buildWorkflowFiles(workflow: StoryWorkflowState): ProjectFileWrite[] {
  return [buildWorkflowStateFile(workflow)];
}

function requiredStageIndex(stage: WorkflowStageId): number {
  return orderedRequiredStages.indexOf(stage);
}

function downstreamStages(stage: WorkflowStageId): WorkflowStageId[] {
  const index = requiredStageIndex(stage);
  if (index < 0) {
    return [];
  }

  return orderedRequiredStages.slice(index + 1);
}

function putArtifact(
  artifacts: StoryWorkflowArtifacts,
  stage: WorkflowStageId,
  artifact: unknown
): StoryWorkflowArtifacts {
  switch (stage) {
    case 'intake':
      return { ...artifacts, initialSettingBook: cloneJson(artifact) as StoryWorkflowArtifacts['initialSettingBook'] };
    case 'world_outline':
      return { ...artifacts, worldOutline: cloneJson(artifact) as StoryWorkflowArtifacts['worldOutline'] };
    case 'character_bible':
      return { ...artifacts, characterBible: cloneJson(artifact) as StoryWorkflowArtifacts['characterBible'] };
    case 'act_timeline':
      return { ...artifacts, actTimeline: cloneJson(artifact) as StoryWorkflowArtifacts['actTimeline'] };
    case 'scene_outline':
      return { ...artifacts, sceneOutline: cloneJson(artifact) as StoryWorkflowArtifacts['sceneOutline'] };
    case 'act_scoring': {
      const score = cloneJson(artifact) as ActScoreReport;
      return {
        ...artifacts,
        actScores: {
          ...artifacts.actScores,
          [score.actId]: score
        }
      };
    }
    case 'full_review':
      return { ...artifacts, fullReview: cloneJson(artifact) as StoryWorkflowArtifacts['fullReview'] };
    case 'chapter_draft':
      return artifacts;
    default:
      return artifacts;
  }
}

function removeArtifactsForStages(
  artifacts: StoryWorkflowArtifacts,
  stages: WorkflowStageId[]
): StoryWorkflowArtifacts {
  const next: StoryWorkflowArtifacts = { ...artifacts };

  for (const stage of stages) {
    switch (stage) {
      case 'intake':
        delete next.initialSettingBook;
        break;
      case 'world_outline':
        delete next.worldOutline;
        break;
      case 'character_bible':
        delete next.characterBible;
        break;
      case 'act_timeline':
        delete next.actTimeline;
        break;
      case 'scene_outline':
        delete next.sceneOutline;
        break;
      case 'act_scoring':
        // Preserve existing act scores on regeneration: individual
        // scores are overwritten by putArtifact via [score.actId] merge.
        break;
      case 'full_review':
        delete next.fullReview;
        break;
      case 'chapter_draft':
        delete next.chapterReviews;
        break;
      default:
        break;
    }
  }

  return next;
}

function lockDownstreamStages(state: StoryWorkflowState, stage: WorkflowStageId): StoryWorkflowState {
  const stages = { ...state.stages };
  for (const downstreamStage of downstreamStages(stage)) {
    stages[downstreamStage] = { status: 'locked' };
  }

  return {
    ...state,
    stages,
    artifacts: removeArtifactsForStages(state.artifacts, downstreamStages(stage))
  };
}

export function buildWorkflowStateFile(workflow: StoryWorkflowState): ProjectFileWrite {
  return {
    relativePath: 'workflow/state.json',
    content: formatJson(workflow)
  };
}

export function confirmWorkflowArtifact(
  project: StoryProject,
  stage: WorkflowStageId,
  artifact: unknown,
  confirmedAt = new Date().toISOString()
): WorkflowProjectMutation {
  const workflowWithArtifact = {
    ...project.workflow,
    artifacts: putArtifact(project.workflow.artifacts, stage, artifact)
  };
  const workflow = confirmWorkflowStage(workflowWithArtifact, stage, confirmedAt);
  const nextProject = {
    ...project,
    ...(stage === 'character_bible'
      ? { characters: cloneJson(workflow.artifacts.characterBible ?? []) }
      : {}),
    workflow
  };

  return {
    project: nextProject,
    files: buildWorkflowFiles(workflow)
  };
}

export function requestWorkflowRegeneration(
  project: StoryProject,
  stage: WorkflowStageId,
  regeneratedAt = new Date().toISOString()
): WorkflowProjectMutation {
  const regenerating = requestStageRegeneration(project.workflow, stage, regeneratedAt);
  const workflow = lockDownstreamStages(
    {
      ...regenerating,
      artifacts: removeArtifactsForStages(regenerating.artifacts, [stage])
    },
    stage
  );
  const nextProject = {
    ...project,
    workflow
  };

  return {
    project: nextProject,
    files: buildWorkflowFiles(workflow)
  };
}

function allOutlinedChaptersReviewed(workflow: StoryWorkflowState): boolean {
  const outlinedChapterIds =
    workflow.artifacts.sceneOutline?.acts.flatMap((act) => act.chapters.map((chapter) => chapter.chapterId)) ?? [];
  if (outlinedChapterIds.length === 0) {
    return false;
  }

  return outlinedChapterIds.every((chapterId) => workflow.artifacts.chapterReviews?.[chapterId]);
}

export function recordWorkflowChapterReview(
  project: StoryProject,
  chapterId: number,
  review: ChapterReviewReport,
  confirmedAt = new Date().toISOString()
): WorkflowProjectMutation {
  const workflowWithReview: StoryWorkflowState = {
    ...project.workflow,
    artifacts: {
      ...project.workflow.artifacts,
      chapterReviews: {
        ...project.workflow.artifacts.chapterReviews,
        [chapterId]: cloneJson(review)
      }
    }
  };
  const workflow =
    workflowWithReview.currentStage === 'chapter_draft' && allOutlinedChaptersReviewed(workflowWithReview)
      ? confirmWorkflowStage(workflowWithReview, 'chapter_draft', confirmedAt)
      : workflowWithReview;
  const nextProject = {
    ...project,
    workflow
  };

  return {
    project: nextProject,
    files: buildWorkflowFiles(workflow)
  };
}
