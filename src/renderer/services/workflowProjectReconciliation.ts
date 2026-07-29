import type { StoryProject, WorkflowStageId } from '../../shared/types.js';

export function reconcileWorkflowProject(
  latestProject: StoryProject,
  requestProject: StoryProject,
  mutationProject: StoryProject,
  stage: WorkflowStageId
): StoryProject {
  if (latestProject === requestProject) return mutationProject;
  return {
    ...latestProject,
    workflow: mutationProject.workflow,
    ...(stage === 'character_bible' ? { characters: mutationProject.characters } : {})
  };
}

/** Only merge a delayed workflow response into the project that started it. */
export function reconcileWorkflowProjectForRequest(
  latestProject: StoryProject,
  requestProject: StoryProject,
  mutationProject: StoryProject,
  stage: WorkflowStageId
): StoryProject | null {
  if (latestProject.rootPath !== requestProject.rootPath) return null;
  return reconcileWorkflowProject(latestProject, requestProject, mutationProject, stage);
}
