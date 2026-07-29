import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');

async function exists(relativePath: string): Promise<boolean> {
  try {
    await access(resolve(root, relativePath), constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

describe('Web/PWA-only repository boundary', () => {
  it('contains no Electron runtime, desktop build scripts, or desktop source roots', async () => {
    const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')) as {
      name: string;
      main?: string;
      config?: Record<string, unknown>;
      scripts: Record<string, string>;
      dependencies?: Record<string, string>;
    };

    expect(packageJson.name).toBe('storyforge-ai');
    expect(packageJson.main).toBeUndefined();
    expect(packageJson.config?.electron_mirror).toBeUndefined();
    expect(packageJson.scripts['dev:electron']).toBeUndefined();
    expect(packageJson.scripts['build:desktop']).toBeUndefined();
    expect(packageJson.dependencies?.electron).toBeUndefined();
    await expect(exists('src/main/main.ts')).resolves.toBe(false);
    await expect(exists('src/preload/preload.ts')).resolves.toBe(false);
  });

  it('keeps desktop adapters and benchmark controls out of the browser application source', async () => {
    for (const path of [
      'src/renderer/services/desktopSkillRunner.ts',
      'src/renderer/services/desktopSummaryService.ts',
      'src/renderer/services/desktopWorkflowService.ts',
      'src/renderer/services/workflowRealBenchmarkController.ts',
      'src/renderer/services/workflowRealBenchmarkOrchestrator.ts',
      'src/renderer/components/BenchmarkAudit.tsx'
    ]) {
      await expect(exists(path)).resolves.toBe(false);
    }
  });

  it('documents only the Web/PWA runtime', async () => {
    const readme = await readFile(resolve(root, 'README.md'), 'utf8');

    expect(readme).not.toMatch(/Electron|build:desktop|dev:electron|src\/main\/|src\/preload\/|benchmark-output/);
  });
});
