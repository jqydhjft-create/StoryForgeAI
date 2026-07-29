import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../..');

describe('web build configuration', () => {
  it('exposes only Web/PWA build commands', async () => {
    const packageJson = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts['dev:web']).toMatch(/vite/);
    expect(packageJson.scripts['build:web']).toMatch(/typecheck/);
    expect(packageJson.scripts['build:web']).toMatch(/vite build/);
    expect(packageJson.scripts['dev:electron']).toBeUndefined();
    expect(packageJson.scripts['build:desktop']).toBeUndefined();
    expect(packageJson.scripts.build).toBe('npm run build:web');
  });

  it('registers an auto-updating PWA manifest with the browser icon', async () => {
    const viteConfig = await readFile(resolve(root, 'vite.config.ts'), 'utf8');
    const manifest = JSON.parse(await readFile(resolve(root, 'public/manifest.webmanifest'), 'utf8')) as Record<string, unknown>;

    expect(viteConfig).toMatch(/import\s+\{\s*VitePWA\s*\}\s+from\s+['"]vite-plugin-pwa['"]/);
    expect(viteConfig).toMatch(/VitePWA\s*\(\s*\{/);
    expect(viteConfig).toMatch(/registerType:\s*['"]autoUpdate['"]/);
    expect(manifest).toMatchObject({
      name: 'StoryForge AI',
      display: 'standalone',
      start_url: './'
    });
    expect(manifest.icons).toEqual(expect.arrayContaining([
      expect.objectContaining({ src: 'storyforge-icon.svg' })
    ]));
  });
});
