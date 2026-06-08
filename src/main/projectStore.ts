import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
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

async function loadIndividualCharacters(projectPath: string): Promise<CharacterProfile[]> {
  const entries = await readdir(join(projectPath, 'characters'), { withFileTypes: true });
  const profileFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name)
    .filter((name) => name !== 'protagonist.json' && name !== 'antagonist.json')
    .sort();

  return Promise.all(
    profileFiles.map((fileName) => readJson<CharacterProfile>(projectPath, join('characters', fileName)))
  );
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

export function toProjectFolderName(name: string): string {
  const folderName = name
    .trim()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  return folderName || 'StoryForge-Project';
}

export async function createProjectInParent(parentPath: string, name: string): Promise<StoryProject> {
  const displayName = name.trim() || 'Untitled Story';
  return createProject(join(parentPath, toProjectFolderName(displayName)), displayName);
}

export async function loadProject(projectPath: string): Promise<StoryProject> {
  const settings = await readJson<StoryProject['settings']>(projectPath, 'settings.json');
  const world = await readJson<WorldBible>(projectPath, 'world/bible.json');
  const protagonist = await readJson<CharacterProfile[]>(projectPath, 'characters/protagonist.json');
  const antagonist = await readJson<CharacterProfile[]>(projectPath, 'characters/antagonist.json');
  const individualCharacters = await loadIndividualCharacters(projectPath);
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
    characters: [...protagonist, ...antagonist, ...individualCharacters],
    plot,
    chapters,
    summary: metaFile.summaryCache
  };
}

export async function saveProjectFile(projectPath: string, relativePath: string, content: string): Promise<void> {
  await writeFile(join(projectPath, relativePath), content, 'utf8');
}

export async function deleteCharacterFile(projectPath: string, characterId: string): Promise<void> {
  if (!/^[a-z0-9-]+$/i.test(characterId)) {
    throw new Error('Invalid character id');
  }

  await rm(join(projectPath, 'characters', `${characterId}.json`), { force: true });
}
