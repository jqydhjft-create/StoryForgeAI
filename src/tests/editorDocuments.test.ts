import { describe, expect, it } from 'vitest';
import type { StoryProject } from '../shared/types';
import { applyEditableDocument, getEditableDocument } from '../renderer/services/editorDocuments';

const project: StoryProject = {
  rootPath: 'D:/Stories/Ash-Road',
  settings: { name: 'Ash Road', createdAt: '2026-06-08T00:00:00.000Z', reviewStrictness: 'medium' },
  world: { genre: 'Low fantasy', premise: 'A road story', rules: ['Keep moving'], terms: {} },
  characters: [],
  plot: [{ id: 'opening', label: 'Opening', summary: 'A beginning', chapterHint: 1 }],
  chapters: [
    {
      meta: { id: 1, title: 'Chapel', sceneCount: 1, characters: ['Ash'], locations: ['Chapel'], timelineDay: 1 },
      content: '# Chapel\n\nOpening text.'
    }
  ],
  summary: { timeline: [], locations: [], characters: [] }
};

describe('editorDocuments', () => {
  it('maps the world selection to the world bible file', () => {
    const document = getEditableDocument(project, { kind: 'world', id: 'bible' });

    expect(document?.relativePath).toBe('world/bible.json');
    expect(document?.content).toContain('Low fantasy');
  });

  it('maps a chapter selection to the chapter markdown file', () => {
    const document = getEditableDocument(project, { kind: 'chapter', id: '1' });

    expect(document?.relativePath).toBe('chapters/01.md');
    expect(document?.content).toContain('Opening text.');
  });

  it('applies edited world JSON to project state', () => {
    const nextProject = applyEditableDocument(
      project,
      { kind: 'world', id: 'bible' },
      JSON.stringify({ genre: 'Mystery', premise: 'A case', rules: [], terms: {} }, null, 2)
    );

    expect(nextProject.world.genre).toBe('Mystery');
  });

  it('applies edited chapter markdown to project state', () => {
    const nextProject = applyEditableDocument(project, { kind: 'chapter', id: '1' }, '# Chapel\n\nChanged.');

    expect(nextProject.chapters[0].content).toContain('Changed.');
  });
});
