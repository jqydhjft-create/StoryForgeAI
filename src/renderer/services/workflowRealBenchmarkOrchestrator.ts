import type { StorySkillRequest, StorySkillResponse, WorkflowBenchmarkRunRequest } from '../../shared/types.js';
import type { RealBenchmarkCaseArtifacts, SourceArtifact } from '../../shared/workflowBenchmark.js';
import { createSkillStoryPlugin } from './plugins/skillStoryPlugin.js';
import { createPluginRegistry } from './plugins/storyPluginTypes.js';
import { buildStorySkillRequest } from './storySkills.js';
import type { StorySkillRunner } from './storySkills.js';

export type { RealBenchmarkCaseArtifacts } from '../../shared/workflowBenchmark.js';

export type BenchmarkSkillRunner = (
  request: WorkflowBenchmarkRunRequest,
  skill: StorySkillRequest
) => Promise<StorySkillResponse>;

export async function executeWorkflowBenchmarkCase(
  request: WorkflowBenchmarkRunRequest,
  caseId: string,
  idea: string,
  runSkill: BenchmarkSkillRunner
): Promise<RealBenchmarkCaseArtifacts> {
  const legacy = await executeLegacyCase(request, idea, runSkill);
  const unified = await executeUnifiedCase(request, idea, runSkill);
  return {
    caseId,
    legacy: artifact('legacy', legacy),
    unified: artifact('unified', unified)
  };
}

function artifact(source: SourceArtifact['source'], value: unknown): SourceArtifact {
  return { source, text: JSON.stringify(value, null, 2) };
}

async function run(
  request: WorkflowBenchmarkRunRequest,
  workflow: 'legacy' | 'unified',
  skillId: StorySkillRequest['skillId'],
  input: unknown,
  runSkill: BenchmarkSkillRunner
): Promise<unknown> {
  let response: StorySkillResponse;
  try {
    response = await runSkill(request, buildStorySkillRequest(skillId, JSON.stringify(input, null, 2)));
  } catch (error) {
    throw new Error(`Benchmark ${workflow} ${skillId} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (response.provider !== 'deepseek') {
    throw new Error(`Benchmark skill ${skillId} returned a non-DeepSeek provider`);
  }
  return response.output;
}

async function executeLegacyCase(request: WorkflowBenchmarkRunRequest, idea: string, runSkill: BenchmarkSkillRunner) {
  const concept = await run(request, 'legacy', 'theme-generator', { idea }, runSkill);
  const world = await run(request, 'legacy', 'world-generator', { idea, concept }, runSkill);
  const characters = await run(request, 'legacy', 'character-generator', { idea, concept, world }, runSkill);
  const plot = await run(request, 'legacy', 'plot-designer', { idea, concept, world, characters }, runSkill);
  const chapter = await run(request, 'legacy', 'scene-writing-workshop', { idea, concept, world, characters, plot }, runSkill);
  return { concept, world, characters, plot, chapter };
}

async function executeUnifiedCase(request: WorkflowBenchmarkRunRequest, idea: string, runSkill: BenchmarkSkillRunner) {
  const registry = createPluginRegistry([createSkillStoryPlugin(strictBenchmarkRunner(request, 'unified', runSkill))]);
  const intake = await registry.invoke('generate_initial_brief', { idea });
  const worldOutline = await registry.invoke('generate_world_and_outline', { idea, initialSettingBook: intake });
  const characterBible = await registry.invoke('generate_characters', { idea, initialSettingBook: intake, worldOutline });
  const actTimeline = await registry.invoke('generate_act_timeline', { initialSettingBook: intake, worldOutline, characters: characterBible });
  const sceneOutline = await registry.invoke('generate_scene_outline', { actTimeline, worldOutline, characters: characterBible });
  const chapter = await registry.invoke('write_chapter', { idea, initialSettingBook: intake, worldOutline, characterBible, actTimeline, sceneOutline });
  return { intake, worldOutline, characterBible, actTimeline, sceneOutline, chapter };
}

function strictBenchmarkRunner(
  request: WorkflowBenchmarkRunRequest,
  workflow: 'legacy' | 'unified',
  runSkill: BenchmarkSkillRunner
): StorySkillRunner {
  return async (skill) => {
    let response: StorySkillResponse;
    try {
      response = await runSkill(request, skill);
    } catch (error) {
      throw new Error(`Benchmark ${workflow} ${skill.skillId} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (response.provider !== 'deepseek') {
      throw new Error(`Benchmark skill ${skill.skillId} returned a non-DeepSeek provider`);
    }
    return response;
  };
}
