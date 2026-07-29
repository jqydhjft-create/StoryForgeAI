import { describe, expect, it } from 'vitest';
import type { StoryProject } from '../shared/types';
import { createInitialWorkflowState } from '../shared/workflowDefaults';
import {
  appendChapterDraft,
  buildSummaryCacheFile,
  createNewCharacter,
  deleteChapter,
  deleteCharacter,
  replaceChapterWithDraft
} from '../renderer/services/projectMutations';

const project: StoryProject = {
  rootPath: 'D:/Stories/Ash-Road',
  settings: { name: 'Ash Road', createdAt: '2026-06-08T00:00:00.000Z', reviewStrictness: 'medium' },
  world: { genre: 'Low fantasy', premise: 'A road story', rules: ['Keep moving'], terms: {} },
  characters: [
    {
      id: 'ash',
      name: 'Ash',
      role: 'Protagonist',
      motivation: 'Find the road home',
      flaw: 'Distrustful',
      arc: 'Learns to ask for help'
    }
  ],
  plot: [{ id: 'opening', label: 'Opening', summary: 'A beginning', chapterHint: 1 }],
  chapters: [
    {
      meta: { id: 1, title: 'Chapel', sceneCount: 1, characters: ['Ash'], locations: ['Chapel'], timelineDay: 1 },
      content: '# Chapel\n\nOpening text.'
    }
  ],
  summary: { timeline: [], locations: [], characters: [] },
  workflow: createInitialWorkflowState()
};

describe('projectMutations', () => {
  it('appends a generated chapter draft without creating a placeholder', () => {
    const result = appendChapterDraft(project, {
      meta: { id: 2, title: 'The Road', sceneCount: 2, characters: ['Ash'], locations: ['Road'], timelineDay: 2 },
      content: '# The Road\n\nAsh follows the road.'
    });

    expect(result.project.chapters[1]).toEqual({
      meta: { id: 2, title: 'The Road', sceneCount: 2, characters: ['Ash'], locations: ['Road'], timelineDay: 2 },
      content: '# The Road\n\nAsh follows the road.'
    });
    expect(result.files.find((file) => file.relativePath === 'chapters/02.md')?.content).toContain('Ash follows the road.');
  });

  it('creates a uniquely named character profile', () => {
    const result = createNewCharacter(project);

    expect(result.project.characters.map((character) => character.id)).toContain('new-character');
    expect(result.files[0].relativePath).toBe('characters/new-character.json');
    expect(result.selection).toEqual({ kind: 'character', id: 'new-character' });
  });

  it('deletes a character and returns the file to remove', () => {
    const result = deleteCharacter(project, 'ash');

    expect(result.project.characters).toEqual([]);
    expect(result.deletedFiles).toEqual(['characters/ash.json']);
    expect(result.selection).toEqual({ kind: 'world', id: 'bible' });
  });

  it('deletes a chapter, removes the markdown file, and rewrites metadata', () => {
    const twoChapterProject: StoryProject = {
      ...project,
      chapters: [
        ...project.chapters,
        {
          meta: { id: 2, title: 'Road', sceneCount: 1, characters: [], locations: [], timelineDay: 2 },
          content: '# Road\n\nMore text.'
        }
      ]
    };

    const result = deleteChapter(twoChapterProject, 1);

    expect(result.project.chapters.map((chapter) => chapter.meta.id)).toEqual([2]);
    expect(result.files.map((file) => file.relativePath)).toEqual(['chapters/meta.json']);
    expect(result.deletedFiles).toEqual(['chapters/01.md']);
    expect(result.selection).toEqual({ kind: 'chapter', id: '2' });
  });

  it('builds a chapter metadata file with summary cache', () => {
    const file = buildSummaryCacheFile(project, {
      timeline: [{ event: 'Chapel', time: 'Day 1', chapter: 1 }],
      locations: [],
      characters: []
    });

    expect(file.relativePath).toBe('chapters/meta.json');
    expect(file.content).toContain('summaryCache');
    expect(file.content).toContain('Chapel');
  });

  it('replaces the selected chapter from a confirmed draft', () => {
    const result = replaceChapterWithDraft(project, {
      meta: { id: 1, title: 'Chapel rewritten', sceneCount: 1, characters: ['Ash'], locations: ['Chapel'], timelineDay: 1 },
      content: '# Chapel rewritten\n\nA cleaner draft.'
    });

    expect(result.project.chapters).toHaveLength(1);
    expect(result.project.chapters[0].meta.title).toBe('Chapel rewritten');
    expect(result.selection).toEqual({ kind: 'chapter', id: '1' });
    expect(result.files.map((file) => file.relativePath)).toEqual(['chapters/01.md', 'chapters/meta.json']);
  });
});
