import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { createProject, loadProject } from '../main/projectStore';

let cleanupPath = '';

afterEach(async () => {
  if (cleanupPath) {
    await rm(cleanupPath, { recursive: true, force: true });
    cleanupPath = '';
  }
});

describe('projectStore', () => {
  it('creates a project with required files', async () => {
    cleanupPath = await mkdtemp(join(tmpdir(), 'storyforge-'));
    const projectPath = join(cleanupPath, 'AshRoad');

    const project = await createProject(projectPath, 'Ash Road');

    expect(project.settings.name).toBe('Ash Road');
    expect(await readFile(join(projectPath, 'settings.json'), 'utf8')).toContain('Ash Road');
    expect(await readFile(join(projectPath, 'world', 'bible.json'), 'utf8')).toContain('Speculative fiction');
    expect(await readFile(join(projectPath, 'chapters', '01.md'), 'utf8')).toContain('# Chapter 1');
  });

  it('loads an existing project', async () => {
    cleanupPath = await mkdtemp(join(tmpdir(), 'storyforge-'));
    const projectPath = join(cleanupPath, 'AshRoad');
    await createProject(projectPath, 'Ash Road');

    const project = await loadProject(projectPath);

    expect(project.rootPath).toBe(projectPath);
    expect(project.chapters[0].meta.title).toBe('Chapter 1');
    expect(project.summary.timeline).toEqual([]);
  });

  it('reports corrupt JSON without replacing it', async () => {
    cleanupPath = await mkdtemp(join(tmpdir(), 'storyforge-'));
    const projectPath = join(cleanupPath, 'AshRoad');
    await createProject(projectPath, 'Ash Road');
    await writeFile(join(projectPath, 'settings.json'), '{bad json', 'utf8');

    await expect(loadProject(projectPath)).rejects.toThrow('Invalid JSON in settings.json');
    expect(await readFile(join(projectPath, 'settings.json'), 'utf8')).toBe('{bad json');
  });
});
