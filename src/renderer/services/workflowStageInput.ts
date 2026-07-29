import type { StoryProject, WorkflowStageId } from '../../shared/types.js';

export function buildWorkflowStageInput(stage: WorkflowStageId, sourceProject: StoryProject, intakeIdea?: string) {
  const artifacts = sourceProject.workflow.artifacts;
  const actId = artifacts.actTimeline?.acts[0]?.id ?? 'act-1';
  const idea = intakeIdea?.trim() || sourceProject.settings.name;

  switch (stage) {
    case 'intake':
      return { idea, projectName: sourceProject.settings.name };
    case 'world_outline':
      return { initialSettingBook: artifacts.initialSettingBook, projectName: sourceProject.settings.name };
    case 'character_bible':
      return {
        initialSettingBook: artifacts.initialSettingBook,
        worldOutline: artifacts.worldOutline,
        projectName: sourceProject.settings.name
      };
    case 'act_timeline':
      return {
        initialSettingBook: artifacts.initialSettingBook,
        worldOutline: artifacts.worldOutline,
        characters: artifacts.characterBible ?? sourceProject.characters
      };
    case 'scene_outline':
      return {
        actTimeline: artifacts.actTimeline,
        worldOutline: artifacts.worldOutline,
        characters: artifacts.characterBible ?? sourceProject.characters
      };
    case 'act_scoring':
      return { actId, actTimeline: artifacts.actTimeline, sceneOutline: artifacts.sceneOutline, chapters: sourceProject.chapters };
    case 'full_review':
      return { chapters: sourceProject.chapters, summary: sourceProject.summary, workflow: sourceProject.workflow };
    case 'chapter_draft':
      return { chapters: sourceProject.chapters, workflow: sourceProject.workflow };
    default:
      return {};
  }
}
