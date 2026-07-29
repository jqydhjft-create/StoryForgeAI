import type { StoryProject, WorkflowStageId } from '../../shared/types.js';
import { createMockStoryPlugin } from './plugins/mockStoryPlugin';
import { createSkillStoryPlugin } from './plugins/skillStoryPlugin';
import { createPluginRegistry, type StoryPluginRegistry } from './plugins/storyPluginTypes';
import type { StorySkillRunner } from './storySkillContracts';
import { generateWorkflowChapterDraft } from './workflowChapterLoop';
import { confirmWorkflowArtifact, requestWorkflowRegeneration } from './workflowMutations';
import { generateStageArtifact } from './workflowStageActions';
import { buildWorkflowStageInput } from './workflowStageInput';

export interface WorkflowServiceDependencies {
  registry: StoryPluginRegistry;
}

export interface WorkflowService {
  generateStage(project: StoryProject, stage: Exclude<WorkflowStageId, 'chapter_draft'>, intakeIdea?: string): ReturnType<typeof generateStageArtifact>;
  generateChapter(project: StoryProject, actId: string, chapterId: number): ReturnType<typeof generateWorkflowChapterDraft>;
  confirmStage(project: StoryProject, stage: WorkflowStageId, artifact: unknown): ReturnType<typeof confirmWorkflowArtifact>;
  regenerateStage(project: StoryProject, stage: WorkflowStageId): ReturnType<typeof requestWorkflowRegeneration>;
}

export function createWorkflowService({ registry }: WorkflowServiceDependencies): WorkflowService {
  return {
    generateStage(project: StoryProject, stage: Exclude<WorkflowStageId, 'chapter_draft'>, intakeIdea?: string) {
      return generateStageArtifact(registry, stage, buildWorkflowStageInput(stage, project, intakeIdea));
    },
    generateChapter(project: StoryProject, actId: string, chapterId: number) {
      return generateWorkflowChapterDraft(registry, project, actId, chapterId);
    },
    confirmStage(project: StoryProject, stage: WorkflowStageId, artifact: unknown) {
      return confirmWorkflowArtifact(project, stage, artifact);
    },
    regenerateStage(project: StoryProject, stage: WorkflowStageId) {
      return requestWorkflowRegeneration(project, stage);
    }
  };
}

/** Builds a complete workflow registry from one runner, or its standalone mock equivalent. */
export function createWorkflowServiceForRunner(runner: StorySkillRunner | null | undefined): WorkflowService {
  const provider = runner ? createSkillStoryPlugin(runner) : createMockStoryPlugin();
  return createWorkflowService({ registry: createPluginRegistry([provider]) });
}
