import type { StoryProject, WorkflowStageId } from '../../shared/types.js';
import type { WorkflowProjectMutation } from './workflowMutations.js';
import { reconcileWorkflowProjectForRequest } from './workflowProjectReconciliation.js';

export interface WorkflowRequestPersistenceDependencies {
  currentProject: () => StoryProject | null;
  saveProject: (project: StoryProject) => Promise<void>;
  replaceProject: (project: StoryProject) => void;
}

/** Persist a response only if its originating project is still active, reconciling edits made while writing. */
export async function persistWorkflowMutationForRequest(
  result: WorkflowProjectMutation,
  requestProject: StoryProject,
  stage: WorkflowStageId,
  { currentProject, saveProject, replaceProject }: WorkflowRequestPersistenceDependencies
): Promise<StoryProject | null> {
  const first = reconcileWorkflowProjectForRequest(currentProject() ?? requestProject, requestProject, result.project, stage);
  if (!first) return null;
  await saveProject(first);
  const latest = reconcileWorkflowProjectForRequest(currentProject() ?? first, requestProject, result.project, stage);
  if (!latest) return null;
  await saveProject(latest);
  replaceProject(latest);
  return latest;
}
