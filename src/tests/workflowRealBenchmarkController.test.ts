import { describe, expect, it } from 'vitest';
import { failedBenchmarkCaseIds, storeRealBenchmarkBatch, runRealBenchmarkBatch } from '../renderer/services/workflowRealBenchmarkController';
import type { WorkflowBenchmarkRunRequest } from '../shared/types';

const lockedRequest: WorkflowBenchmarkRunRequest = {
  provider: 'deepseek',
  model: 'deepseek-v4-pro',
  temperature: 0.7,
  maxTokens: 6000
};

describe('workflow real benchmark controller', () => {
  it('does not execute any benchmark case when the provider gate rejects', async () => {
    let executionCount = 0;

    await expect(runRealBenchmarkBatch(
      lockedRequest,
      async () => { throw new Error('Benchmark provider is not configured'); },
      async () => { executionCount += 1; }
    )).rejects.toThrow('Benchmark provider is not configured');

    expect(executionCount).toBe(0);
  });

  it('records one failed case and continues through the remaining fixed cases', async () => {
    const executedIds: string[] = [];
    const results = await runRealBenchmarkBatch(
      lockedRequest,
      async () => undefined,
      async (id) => {
        executedIds.push(id);
        if (id === 'crime') throw new Error('deliberate case failure');
      }
    );

    expect(executedIds).toHaveLength(12);
    expect(results).toHaveLength(12);
    expect(results.find((result) => result.id === 'crime')).toEqual({
      id: 'crime',
      status: 'failed',
      error: 'deliberate case failure'
    });
    expect(results.filter((result) => result.status === 'completed')).toHaveLength(11);
  });

  it('passes every result row but only completed artifacts to the existing storage boundary', async () => {
    const received: unknown[] = [];
    await storeRealBenchmarkBatch(lockedRequest, {
      results: [
        { id: 'mystery', status: 'completed' },
        { id: 'science-fiction', status: 'failed', error: 'strict validation failed' }
      ],
      artifacts: [{
        caseId: 'mystery',
        legacy: { source: 'legacy', text: 'legacy' },
        unified: { source: 'unified', text: 'unified' }
      }]
    }, async (...args) => {
      received.push(args);
      return { outputPath: 'benchmark-output/run' };
    });

    expect(received).toEqual([[
      lockedRequest,
      ['mystery', 'romance', 'science-fiction', 'historical', 'fantasy', 'realism', 'crime', 'adventure', 'campus', 'workplace', 'family', 'horror'],
      [
        { id: 'mystery', status: 'completed' },
        { id: 'science-fiction', status: 'failed', error: 'strict validation failed' }
      ],
      [{
        caseId: 'mystery',
        legacy: { source: 'legacy', text: 'legacy' },
        unified: { source: 'unified', text: 'unified' }
      }]
    ]]);
  });

  it('selects only case IDs that are recorded as failed in the manifest', () => {
    expect(failedBenchmarkCaseIds({
      expectedCaseIds: ['mystery', 'science-fiction', 'realism'],
      results: [
        { id: 'mystery', status: 'completed' },
        { id: 'science-fiction', status: 'failed', error: 'timeout' },
        { id: 'realism', status: 'failed', error: 'invalid payload' }
      ]
    })).toEqual(['science-fiction', 'realism']);
  });
});
