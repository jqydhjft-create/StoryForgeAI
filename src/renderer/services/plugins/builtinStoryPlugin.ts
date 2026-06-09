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
      generate_initial_brief: (input) => runMappedSkill(runner, 'theme-generator', input),
      generate_world_and_outline: async (input) => {
        const world = await runMappedSkill(runner, 'world-generator', input);
        const plot = await runMappedSkill(runner, 'plot-designer', { input, world });
        return { world, plot };
      },
      generate_act_timeline: (input) => runMappedSkill(runner, 'plot-designer', input),
      generate_scene_outline: (input) => runMappedSkill(runner, 'plot-designer', input),
      write_chapter: (input) => runMappedSkill(runner, 'next-chapter-workshop', input),
      review_chapter: (input) => runMappedSkill(runner, 'logic-detective', input),
      score_act: (input) => runMappedSkill(runner, 'integrated-gate', input),
      review_full_text: (input) => runMappedSkill(runner, 'integrated-gate', input),
      lookup_history: async (input) => ({ fragments: [], input }),
      check_hard_rules: (input) => runMappedSkill(runner, 'logic-detective', input),
      mark_inconsistency: async (input) => ({ status: 'marked', input }),
      update_state_machine: async (input) => ({ stateMachine: input })
    }
  };
}
