import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { closeBrowserDatabase, openBrowserDatabase } from '../renderer/services/browser/browserDb';
import { createBrowserProjectStore } from '../renderer/services/browser/browserProjectStore';

async function clearProjects(): Promise<void> {
  const database = await openBrowserDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction('projects', 'readwrite');
    transaction.objectStore('projects').clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

describe('browserProjectStore', () => {
  beforeEach(clearProjects);

  afterEach(() => {
    closeBrowserDatabase();
  });

  it('creates, saves, loads, and lists projects with newest first', async () => {
    const store = createBrowserProjectStore();
    const older = await store.create('Older');
    const newer = await store.create('Newer');
    const changed = { ...older, settings: { ...older.settings, name: 'Changed' } };

    await store.save(changed);

    expect(changed.rootPath).toMatch(/^browser:/);
    expect(changed.chapters).toEqual([
      expect.objectContaining({ meta: expect.objectContaining({ id: 1, title: 'Chapter 1' }), content: '# Chapter 1\n\n' })
    ]);
    expect(changed.workflow.currentStage).toBe('intake');
    await expect(store.load(changed.rootPath)).resolves.toEqual(changed);
    expect((await store.list()).map((project) => project.rootPath)).toEqual([changed.rootPath, newer.rootPath]);
  });

  it('exports portable backups without AI keys', async () => {
    const store = createBrowserProjectStore();
    const project = await store.create('Export me');
    const extendedProject = project as typeof project & { apiKey?: string; settings: typeof project.settings & { OPENAI_API_KEY?: string }; workflow: typeof project.workflow & { artifacts: typeof project.workflow.artifacts & { openaiApiKey?: string } } };
    extendedProject.apiKey = 'secret';
    extendedProject.settings.OPENAI_API_KEY = 'settings-secret';
    extendedProject.workflow.artifacts.openaiApiKey = 'artifact-secret';

    const backup = store.exportProject(project);

    expect(backup).toMatchObject({
      format: 'storyforge-browser-project',
      version: 1,
      exportedAt: expect.any(String),
      project: expect.objectContaining({ settings: expect.objectContaining({ name: 'Export me' }) })
    });
    expect(JSON.stringify(backup)).not.toContain('secret');
    await store.save(extendedProject);
    expect(JSON.stringify(await store.load(project.rootPath))).not.toContain('secret');
  });

  it('rejects invalid imports without changing existing projects', async () => {
    const store = createBrowserProjectStore();
    const existing = await store.create('Keep me');
    const validBackup = store.exportProject(existing);

    await expect(store.importProject({ format: 'storyforge-browser-project', version: 1, project: {} })).rejects.toThrow(
      'Invalid StoryForge project backup'
    );
    await expect(store.importProject({ ...validBackup, exportedAt: 1 })).rejects.toThrow('Invalid StoryForge project backup');

    expect((await store.list()).map((project) => project.rootPath)).toEqual([existing.rootPath]);
  });

  it('rejects malformed nested project data without changing existing projects', async () => {
    const store = createBrowserProjectStore();
    const existing = await store.create('Keep me');
    const validBackup = store.exportProject(existing);
    const malformedBackups = [
      (backup: Record<string, unknown>) => {
        (backup.project as Record<string, unknown>).characters = [42];
      },
      (backup: Record<string, unknown>) => {
        const project = backup.project as Record<string, unknown>;
        (project.chapters as Array<Record<string, unknown>>)[0].meta = { id: 'one' };
      },
      (backup: Record<string, unknown>) => {
        ((backup.project as Record<string, unknown>).workflow as Record<string, unknown>).currentStage = 'invalid';
      },
      (backup: Record<string, unknown>) => {
        ((backup.project as Record<string, unknown>).workflow as Record<string, unknown>).stages = {};
      },
      (backup: Record<string, unknown>) => {
        ((backup.project as Record<string, unknown>).summary as Record<string, unknown>).timeline = [42];
      },
      (backup: Record<string, unknown>) => {
        ((backup.project as Record<string, unknown>).workflow as Record<string, unknown>).artifacts = {
          fullReview: { status: 'invalid', summary: '', issues: [] }
        };
      }
    ];

    for (const corrupt of malformedBackups) {
      const backup = JSON.parse(JSON.stringify(validBackup)) as Record<string, unknown>;
      corrupt(backup);

      await expect(store.importProject(backup)).rejects.toThrow('Invalid StoryForge project backup');
      expect((await store.list()).map((project) => project.rootPath)).toEqual([existing.rootPath]);
    }
  });

  it('imports a valid backup to a fresh browser path and persists it', async () => {
    const store = createBrowserProjectStore();
    const source = await store.create('Source');
    const imported = await store.importProject(store.exportProject(source));

    expect(imported.rootPath).not.toBe(source.rootPath);
    expect(imported.rootPath).toMatch(/^browser:/);
    await expect(store.load(imported.rootPath)).resolves.toEqual(imported);
  });

  it('removes nested provider keys during import, save, load, and export', async () => {
    const store = createBrowserProjectStore();
    const source = await store.create('Source');
    const backup = store.exportProject(source);
    (backup.project.workflow.artifacts as typeof backup.project.workflow.artifacts & { worldOutline?: { worldDocument: string; masterOutline: string; OPENAI_API_KEY?: string } }).worldOutline = {
      worldDocument: 'World',
      masterOutline: 'Outline',
      OPENAI_API_KEY: 'world-outline-secret'
    };

    const imported = await store.importProject(backup);
    await store.save(imported);

    expect(JSON.stringify(await store.load(imported.rootPath))).not.toContain('world-outline-secret');
    expect(JSON.stringify(store.exportProject(imported))).not.toContain('world-outline-secret');
  });

  it('rejects invalid runtime workflow stage statuses when saving or exporting', async () => {
    const store = createBrowserProjectStore();
    const project = await store.create('Invalid stage');
    project.workflow.stages.intake.status = 'invalid' as typeof project.workflow.stages.intake.status;

    await expect(store.save(project)).rejects.toThrow('Invalid browser project');
    expect(() => store.exportProject(project)).toThrow('Invalid browser project');
  });
});
