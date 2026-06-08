import type { CharacterProfile, ProjectFileWrite, StoryProject, SummaryData } from '../../shared/types.js';
import type { StorySeed } from './mockAiService';

type Selection = { kind: 'world' | 'character' | 'chapter'; id: string };

interface ProjectMutation {
  project: StoryProject;
  files: ProjectFileWrite[];
  deletedFiles: string[];
  selection: Selection;
}

function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function formatChapterPath(id: number): string {
  return `chapters/${String(id).padStart(2, '0')}.md`;
}

function formatCharacterPath(id: string): string {
  return `characters/${id}.json`;
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'character'
  );
}

function uniqueCharacterId(project: StoryProject, name: string): string {
  const existing = new Set(project.characters.map((character) => character.id));
  const base = slugify(name);
  if (!existing.has(base)) return base;

  let suffix = 2;
  while (existing.has(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}

function seedChapterContent(): string {
  return '# Chapter 1\n\nAsh finds Milo in a ruined chapel at dawn.';
}

export function buildSummaryCacheFile(project: StoryProject, summary: SummaryData): ProjectFileWrite {
  return {
    relativePath: 'chapters/meta.json',
    content: formatJson({
      chapters: project.chapters.map((chapter) => chapter.meta),
      summaryCache: summary
    })
  };
}

export function createNextChapter(project: StoryProject): ProjectMutation {
  const nextId = Math.max(0, ...project.chapters.map((chapter) => chapter.meta.id)) + 1;
  const chapter = {
    meta: {
      id: nextId,
      title: `Chapter ${nextId}`,
      sceneCount: 1,
      characters: [],
      locations: [],
      timelineDay: nextId
    },
    content: `# Chapter ${nextId}\n\n`
  };
  const nextProject = {
    ...project,
    chapters: [...project.chapters, chapter]
  };

  return {
    project: nextProject,
    files: [
      { relativePath: formatChapterPath(nextId), content: chapter.content },
      buildSummaryCacheFile(nextProject, nextProject.summary)
    ],
    deletedFiles: [],
    selection: { kind: 'chapter', id: String(nextId) }
  };
}

export function createNewCharacter(project: StoryProject, name = 'New Character'): ProjectMutation {
  const id = uniqueCharacterId(project, name);
  const character: CharacterProfile = {
    id,
    name,
    role: 'Supporting',
    motivation: '',
    flaw: '',
    arc: ''
  };
  const nextProject = {
    ...project,
    characters: [...project.characters, character]
  };

  return {
    project: nextProject,
    files: [{ relativePath: formatCharacterPath(id), content: formatJson(character) }],
    deletedFiles: [],
    selection: { kind: 'character', id }
  };
}

export function deleteCharacter(project: StoryProject, id: string): ProjectMutation {
  return {
    project: {
      ...project,
      characters: project.characters.filter((character) => character.id !== id)
    },
    files: [],
    deletedFiles: [formatCharacterPath(id)],
    selection: { kind: 'world', id: 'bible' }
  };
}

export function applyStorySeedToProject(project: StoryProject, seed: StorySeed): ProjectMutation {
  const summary = { timeline: [], locations: [], characters: [] };
  const chapters = [
    {
      meta: {
        id: 1,
        title: 'Chapter 1',
        sceneCount: 1,
        characters: ['Ash', 'Milo'],
        locations: ['Ruined Chapel'],
        timelineDay: 1
      },
      content: seedChapterContent()
    }
  ];
  const nextProject: StoryProject = {
    ...project,
    settings: { ...project.settings, name: seed.concept.title },
    world: seed.world,
    characters: seed.characters,
    plot: seed.plot,
    chapters,
    summary
  };
  const seedCharacterIds = new Set(seed.characters.map((character) => character.id));

  return {
    project: nextProject,
    files: [
      { relativePath: 'settings.json', content: formatJson(nextProject.settings) },
      { relativePath: 'world/bible.json', content: formatJson(nextProject.world) },
      { relativePath: 'plot/beat_sheet.json', content: formatJson(nextProject.plot) },
      ...nextProject.characters.map((character) => ({
        relativePath: formatCharacterPath(character.id),
        content: formatJson(character)
      })),
      { relativePath: formatChapterPath(1), content: chapters[0].content },
      buildSummaryCacheFile(nextProject, summary)
    ],
    deletedFiles: project.characters
      .filter((character) => !seedCharacterIds.has(character.id))
      .map((character) => formatCharacterPath(character.id)),
    selection: { kind: 'world', id: 'bible' }
  };
}
