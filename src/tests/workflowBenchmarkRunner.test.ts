import { describe, expect, it } from 'vitest';
import { runStructuralBenchmark } from '../renderer/services/workflowBenchmarkRunner';

describe('workflow structural benchmark', () => {
  it('runs twelve deterministic cases with visible invalid-output failures', async () => {
    const [first, second] = await Promise.all([runStructuralBenchmark(), runStructuralBenchmark()]);
    expect(first.cases).toHaveLength(12);
    expect(first).toEqual(second);
    expect(first.cases.every((item) => item.assetsComplete && item.crossReferencesValid && item.chapterContinuity && item.reviewBlocked)).toBe(true);
    expect(first.invalidOutput.failureVisible).toBe(true);
    expect(first.invalidOutput.confirmed).toBe(false);
  });
});
