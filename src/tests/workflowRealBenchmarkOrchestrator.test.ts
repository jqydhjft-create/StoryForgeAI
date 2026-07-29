import { describe, expect, it, vi } from 'vitest';
import { executeWorkflowBenchmarkCase } from '../renderer/services/workflowRealBenchmarkOrchestrator';
import type { StorySkillRequest, WorkflowBenchmarkRunRequest } from '../shared/types';

const request: WorkflowBenchmarkRunRequest = {
  provider: 'deepseek',
  model: 'deepseek-v4-pro',
  temperature: 0.7,
  maxTokens: 6000
};

describe('workflow real benchmark orchestrator', () => {
  it('runs strict legacy and unified skill sequences without mock fallback', async () => {
    const runSkill = vi.fn(async (_request: WorkflowBenchmarkRunRequest, skill: StorySkillRequest) => ({
      skillId: skill.skillId,
      provider: 'deepseek' as const,
      output: { skill: skill.skillId }
    }));

    const result = await executeWorkflowBenchmarkCase(request, 'mystery', 'An archivist finds a memory-changing ledger.', runSkill);

    expect(runSkill.mock.calls.map(([, skill]) => skill.skillId)).toEqual([
      'theme-generator',
      'world-generator',
      'character-generator',
      'plot-designer',
      'scene-writing-workshop',
      'theme-generator',
      'world-generator',
      'plot-designer',
      'character-generator',
      'act-timeline-generator',
      'scene-outline-generator',
      'chapter-draft-writer'
    ]);
    expect(result.legacy.source).toBe('legacy');
    expect(result.unified.source).toBe('unified');
    expect(result.legacy.text).toContain('scene-writing-workshop');
    expect(result.unified.text).toContain('chapter-draft-writer');
  });

  it('propagates an API failure instead of fabricating a source artifact', async () => {
    await expect(executeWorkflowBenchmarkCase(
      request,
      'mystery',
      'An archivist finds a memory-changing ledger.',
      async () => { throw new Error('DeepSeek request failed'); }
    )).rejects.toThrow('Benchmark legacy theme-generator failed: DeepSeek request failed');
  });
});
