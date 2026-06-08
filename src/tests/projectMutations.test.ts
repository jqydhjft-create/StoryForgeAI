import { describe, expect, it } from 'vitest';
import type { StoryProject } from '../shared/types';
import { generateStorySeed } from '../renderer/services/mockAiService';
import {
  applyStorySeedToProject,
  buildSummaryCacheFile,
  createNewCharacter,
  createNextChapter,
  deleteCharacter
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
  summary: { timeline: [], locations: [], characters: [] }
};

describe('projectMutations', () => {
  it('creates the next chapter and file writes', () => {
    const result = createNextChapter(project);

    expect(result.project.chapters[1].meta.id).toBe(2);
    expect(result.selection).toEqual({ kind: 'chapter', id: '2' });
    expect(result.files.map((file) => file.relativePath)).toEqual(['chapters/02.md', 'chapters/meta.json']);
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

  it('applies generated seed assets to an existing project with file writes', () => {
    const result = applyStorySeedToProject(
      {
        ...project,
        characters: [
          ...project.characters,
          {
            id: 'legacy',
            name: 'Legacy',
            role: 'Supporting',
            motivation: 'Stay behind',
            flaw: 'Static',
            arc: 'Leaves the draft'
          }
        ]
      },
      generateStorySeed('A plague road.')
    );

    expect(result.project.settings.name).toBe('Wasteland Guardian');
    expect(result.project.characters).toHaveLength(3);
    expect(result.deletedFiles).toEqual(['characters/legacy.json']);
    expect(result.files.map((file) => file.relativePath)).toContain('settings.json');
    expect(result.files.map((file) => file.relativePath)).toContain('characters/milo.json');
    expect(result.files.map((file) => file.relativePath)).toContain('chapters/meta.json');
  });
});
