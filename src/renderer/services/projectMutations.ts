import type { CharacterProfile, ProjectFileWrite, StoryProject, SummaryData } from '../../shared/types.js';
import type { StorySeed } from './mockAiService';
import type { NextChapterWorkflowResult } from './nextChapterWorkflow';
import type { StoryWorkflowResult } from './storyWorkflow';

type Selection = { kind: 'world' | 'character' | 'chapter' | 'summary'; id: string };

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

function normalizeGeneratedCharacters(characters: CharacterProfile[]): CharacterProfile[] {
  const used = new Set<string>();

  return characters.map((character) => {
    const base = slugify(character.id) || slugify(character.name);
    let id = base;
    let suffix = 2;
    while (used.has(id)) {
      id = `${base}-${suffix}`;
      suffix += 1;
    }
    used.add(id);

    return { ...character, id };
  });
}

function createDefaultSeedChapter(seed: StorySeed): StoryWorkflowResult['initialChapter'] {
  const protagonist = seed.characters[0]?.name ?? '主角';
  const companion = seed.characters[1]?.name ?? '同行者';

  return {
    meta: {
      id: 1,
      title: '第一章',
      sceneCount: 1,
      characters: [protagonist, companion],
      locations: ['废弃礼拜堂'],
      timelineDay: 1
    },
    content: `# 第一章\n\n黎明时分，${protagonist}在一座废弃礼拜堂里发现了${companion}。`
  };
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

export function applyNextChapterToProject(project: StoryProject, workflow: NextChapterWorkflowResult): ProjectMutation {
  const existingChapterIds = new Set(project.chapters.map((chapter) => chapter.meta.id));
  const chapter = existingChapterIds.has(workflow.chapter.meta.id)
    ? {
        ...workflow.chapter,
        meta: {
          ...workflow.chapter.meta,
          id: Math.max(0, ...project.chapters.map((item) => item.meta.id)) + 1
        }
      }
    : workflow.chapter;

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

export function replaceChapterWithDraft(project: StoryProject, chapter: StoryWorkflowResult['initialChapter']): ProjectMutation {
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

export function applyStorySeedToProject(project: StoryProject, seed: StorySeed): ProjectMutation {
  return applyStoryWorkflowToProject(project, {
    idea: '',
    seed,
    initialChapter: createDefaultSeedChapter(seed),
    gateReports: [],
    contextDigest: '',
    changeLog: []
  });
}

export function applyStoryWorkflowToProject(project: StoryProject, workflow: StoryWorkflowResult): ProjectMutation {
  const failedGate = workflow.gateReports.find((report) => report.status === 'failed');
  if (failedGate) {
    throw new Error(`Quality gate failed: ${failedGate.label}`);
  }

  const seed = {
    ...workflow.seed,
    characters: normalizeGeneratedCharacters(workflow.seed.characters)
  };
  const summary = { timeline: [], locations: [], characters: [] };
  const chapters = [workflow.initialChapter];
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
