import { buildStorySkillRequest, type StorySkillRunner } from '../storySkills';
import type { StoryPlugin } from './storyPluginTypes';

async function runMappedSkill(runner: StorySkillRunner, skillId: Parameters<typeof buildStorySkillRequest>[0], input: unknown) {
  const response = await runner(buildStorySkillRequest(skillId, JSON.stringify(input, null, 2)));
  return response.output;
}

export function createBuiltinStoryPlugin(runner: StorySkillRunner): StoryPlugin {
  return {
    id: 'builtin-story-plugin',
    capabilities: {
      write_chapter: (input) => runMappedSkill(runner, 'next-chapter-workshop', input),
      review_chapter: (input) => runMappedSkill(runner, 'logic-detective', input)
    }
  };
}
