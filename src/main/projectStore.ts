import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  createDefaultChapterMeta,
  createDefaultSettings,
  createDefaultSummary,
  createDefaultWorld,
  formatJson
} from '../shared/templates.js';
import type { CharacterProfile, ChapterMeta, PlotBeat, StoryProject, SummaryData, WorldBible } from '../shared/types.js';

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, formatJson(value), 'utf8');
}

async function readJson<T>(projectPath: string, relativePath: string): Promise<T> {
  const absolutePath = join(projectPath, relativePath);
  const raw = await readFile(absolutePath, 'utf8');

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`Invalid JSON in ${relativePath}`);
  }
}

export async function createProject(projectPath: string, name: string): Promise<StoryProject> {
  await mkdir(join(projectPath, 'world'), { recursive: true });
  await mkdir(join(projectPath, 'characters', 'supporting'), { recursive: true });
  await mkdir(join(projectPath, 'plot'), { recursive: true });
  await mkdir(join(projectPath, 'chapters'), { recursive: true });
  await mkdir(join(projectPath, 'exports'), { recursive: true });

  const settings = createDefaultSettings(name);
  const world = createDefaultWorld();
  const chapterMeta = createDefaultChapterMeta();
  const summary = createDefaultSummary();

  await writeJson(join(projectPath, 'settings.json'), settings);
  await writeJson(join(projectPath, 'world', 'bible.json'), world);
  await writeFile(join(projectPath, 'world', 'terms.md'), '# Terms\n\n', 'utf8');
  await writeJson(join(projectPath, 'characters', 'protagonist.json'), []);
  await writeJson(join(projectPath, 'characters', 'antagonist.json'), []);
  await writeJson(join(projectPath, 'plot', 'beat_sheet.json'), []);
  await writeFile(join(projectPath, 'plot', 'outline.md'), '# Outline\n\n', 'utf8');
  await writeJson(join(projectPath, 'chapters', 'meta.json'), { chapters: chapterMeta, summaryCache: summary });
  await writeFile(join(projectPath, 'chapters', '01.md'), '# Chapter 1\n\n', 'utf8');
  await writeFile(join(projectPath, 'exports', 'summary.md'), '', 'utf8');

  return loadProject(projectPath);
}

export async function loadProject(projectPath: string): Promise<StoryProject> {
  const settings = await readJson<StoryProject['settings']>(projectPath, 'settings.json');
  const world = await readJson<WorldBible>(projectPath, 'world/bible.json');
  const protagonist = await readJson<CharacterProfile[]>(projectPath, 'characters/protagonist.json');
  const antagonist = await readJson<CharacterProfile[]>(projectPath, 'characters/antagonist.json');
  const plot = await readJson<PlotBeat[]>(projectPath, 'plot/beat_sheet.json');
  const metaFile = await readJson<{ chapters: ChapterMeta[]; summaryCache: SummaryData }>(projectPath, 'chapters/meta.json');
  const chapters = await Promise.all(
    metaFile.chapters.map(async (meta) => ({
      meta,
      content: await readFile(join(projectPath, 'chapters', `${String(meta.id).padStart(2, '0')}.md`), 'utf8')
    }))
  );

  return {
    rootPath: projectPath,
    settings,
    world,
    characters: [...protagonist, ...antagonist],
    plot,
    chapters,
    summary: metaFile.summaryCache
  };
}

export async function saveProjectFile(projectPath: string, relativePath: string, content: string): Promise<void> {
  await writeFile(join(projectPath, relativePath), content, 'utf8');
}
