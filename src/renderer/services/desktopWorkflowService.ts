import { createDesktopSkillRunner } from './desktopSkillRunner.js';
import { createWorkflowServiceForRunner } from './workflowService.js';

/** Electron-only workflow composition root. */
export function createDesktopWorkflowService() {
  return createWorkflowServiceForRunner(createDesktopSkillRunner());
}
