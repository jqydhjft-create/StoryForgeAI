/**
 * Legacy desktop-facing compatibility module.
 * Browser code imports storySkillContracts directly so the Electron bridge cannot enter its bundle.
 */
export { buildStorySkillRequest, type StorySkillRunner } from './storySkillContracts.js';
export { createDesktopSkillRunner } from './desktopSkillRunner.js';
