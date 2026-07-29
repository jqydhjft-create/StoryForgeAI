import type {
  CharacterProfile,
  GeneratedChapterDraft,
  ProjectFileWrite,
  StoryProject,
  SummaryData
} from '../../shared/types.js';

type Selection = { kind: 'world' | 'character' | 'chapter' | 'summary'; id: string };

export interface ProjectMutation {
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

export function buildSummaryCacheFile(project: StoryProject, summary: SummaryData): ProjectFileWrite {
  return {
    relativePath: 'chapters/meta.json',
    content: formatJson({
      chapters: project.chapters.map((chapter) => chapter.meta),
      summaryCache: summary
    })
  };
}

export function appendChapterDraft(project: StoryProject, chapter: GeneratedChapterDraft): ProjectMutation {
  if (project.chapters.some((item) => item.meta.id === chapter.meta.id)) {
    throw new Error(`Chapter ${chapter.meta.id} already exists`);
  }
  const nextProject = {
    ...project,
    chapters: [...project.chapters, chapter].sort((left, right) => left.meta.id - right.meta.id)
  };
  return {
    project: nextProject,
    files: [
      { relativePath: formatChapterPath(chapter.meta.id), content: chapter.content },
      buildSummaryCacheFile(nextProject, nextProject.summary)
    ],
    deletedFiles: [],
    selection: { kind: 'chapter', id: String(chapter.meta.id) }
  };
}

export function replaceChapterWithDraft(project: StoryProject, chapter: GeneratedChapterDraft): ProjectMutation {
  const nextProject = {
    ...project,
    chapters: project.chapters
      .map((item) => (item.meta.id === chapter.meta.id ? chapter : item))
      .sort((left, right) => left.meta.id - right.meta.id)
  };

  return {
    project: nextProject,
    files: [
      { relativePath: formatChapterPath(chapter.meta.id), content: chapter.content },
      buildSummaryCacheFile(nextProject, nextProject.summary)
    ],
    deletedFiles: [],
    selection: { kind: 'chapter', id: String(chapter.meta.id) }
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

export function deleteChapter(project: StoryProject, id: number): ProjectMutation {
  const chapters = project.chapters.filter((chapter) => chapter.meta.id !== id);
  const nextProject = {
    ...project,
    chapters
  };
  const nextSelection =
    chapters[0] ? ({ kind: 'chapter', id: String(chapters[0].meta.id) } as const) : ({ kind: 'summary', id: 'summary' } as const);

  return {
    project: nextProject,
    files: [buildSummaryCacheFile(nextProject, nextProject.summary)],
    deletedFiles: [formatChapterPath(id)],
    selection: nextSelection
  };
}
