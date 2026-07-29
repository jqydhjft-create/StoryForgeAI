import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { writeRealBenchmarkArtifacts } from '../main/workflowBenchmarkStore';

const temporaryRoots: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe('workflow benchmark store', () => {
  it('writes labelled raw artifacts and a randomized A/B packet under a fixed output root', async () => {
    const outputRoot = await mkdtemp(join(tmpdir(), 'storyforge-benchmark-'));
    temporaryRoots.push(outputRoot);
    const result = await writeRealBenchmarkArtifacts({
      provider: 'deepseek',
      model: 'deepseek-v4-pro',
      temperature: 0.7,
      maxTokens: 6000,
      expectedCaseIds: ['mystery', 'science-fiction'],
      results: [
        { id: 'mystery', status: 'completed' },
        { id: 'science-fiction', status: 'failed', error: 'strict output validation failed' }
      ],
      artifacts: [{
        caseId: 'mystery',
        legacy: { source: 'legacy', text: 'Legacy artifact' },
        unified: { source: 'unified', text: 'Unified artifact' }
      }]
    }, outputRoot, () => 0.9);

    const packet = JSON.parse(await readFile(join(result.outputPath, 'blind-packets.json'), 'utf8'));
    const rawLegacy = await readFile(join(result.outputPath, 'raw', 'mystery-legacy.json'), 'utf8');
    const metadata = JSON.parse(await readFile(join(result.outputPath, 'metadata.json'), 'utf8'));
    const results = JSON.parse(await readFile(join(result.outputPath, 'results.json'), 'utf8'));
    const report = JSON.parse(await readFile(join(result.outputPath, 'real-model-report.json'), 'utf8'));

    expect(result.outputPath.startsWith(outputRoot)).toBe(true);
    expect(packet[0].artifacts).toEqual([
      { label: 'A', text: 'Unified artifact' },
      { label: 'B', text: 'Legacy artifact' }
    ]);
    expect(rawLegacy).toContain('Legacy artifact');
    expect(metadata).toMatchObject({ expectedCaseCount: 2, completedCaseCount: 1, failedCaseCount: 1, failureRate: 0.5 });
    expect(results).toEqual({
      expectedCaseIds: ['mystery', 'science-fiction'],
      results: [
        { id: 'mystery', status: 'completed' },
        { id: 'science-fiction', status: 'failed', error: 'strict output validation failed' }
      ]
    });
    expect(report.legacyDeletionDecision).toMatchObject({ status: 'blocked' });
    expect(report.legacyDeletionDecision.reasons).toContain('Real-model run is incomplete');
  });

  it('writes independently parseable per-case blind packets for long Unicode artifacts', async () => {
    const outputRoot = await mkdtemp(join(tmpdir(), 'storyforge-benchmark-'));
    temporaryRoots.push(outputRoot);
    const longText = `${'长篇中文内容'.repeat(2000)}\uD800`;
    const result = await writeRealBenchmarkArtifacts({
      provider: 'deepseek',
      model: 'deepseek-v4-pro',
      temperature: 0.7,
      maxTokens: 6000,
      expectedCaseIds: ['mystery'],
      results: [{ id: 'mystery', status: 'completed' }],
      artifacts: [{
        caseId: 'mystery',
        legacy: { source: 'legacy', text: longText },
        unified: { source: 'unified', text: 'Unified artifact' }
      }]
    }, outputRoot, () => 0);

    const index = JSON.parse(await readFile(join(result.outputPath, 'blind', 'index.json'), 'utf8'));
    const packet = JSON.parse(await readFile(join(result.outputPath, 'blind', 'mystery.json'), 'utf8'));

    expect(index).toEqual({ caseIds: ['mystery'] });
    expect(packet.caseId).toBe('mystery');
    expect(packet.artifacts[0].text).not.toContain('\uD800');
  });
});
