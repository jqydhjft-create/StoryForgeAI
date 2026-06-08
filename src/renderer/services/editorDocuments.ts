import type { PlotBeat, StoryProject, TreeNodeKind, WorldBible } from '../../shared/types.js';

export interface EditorSelection {
  kind: TreeNodeKind;
  id: string;
}

export interface EditableDocument {
  title: string;
  relativePath: string;
  content: string;
}

function formatChapterPath(id: number): string {
  return `chapters/${String(id).padStart(2, '0')}.md`;
}

function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function getEditableDocument(project: StoryProject, selection: EditorSelection): EditableDocument | null {
  if (selection.kind === 'world') {
    return {
      title: 'World Bible',
      relativePath: 'world/bible.json',
      content: formatJson(project.world)
    };
  }

  if (selection.kind === 'plot') {
    return {
      title: 'Beat Sheet',
      relativePath: 'plot/beat_sheet.json',
      content: formatJson(project.plot)
    };
  }

  if (selection.kind === 'chapter') {
    const chapter = project.chapters.find((item) => String(item.meta.id) === selection.id);
    if (!chapter) return null;

    return {
      title: chapter.meta.title,
      relativePath: formatChapterPath(chapter.meta.id),
      content: chapter.content
    };
  }

  return null;
}

export function applyEditableDocument(project: StoryProject, selection: EditorSelection, content: string): StoryProject {
  if (selection.kind === 'world') {
    return {
      ...project,
      world: JSON.parse(content) as WorldBible
    };
  }

  if (selection.kind === 'plot') {
    return {
      ...project,
      plot: JSON.parse(content) as PlotBeat[]
    };
  }

  if (selection.kind === 'chapter') {
    return {
      ...project,
      chapters: project.chapters.map((chapter) =>
        String(chapter.meta.id) === selection.id ? { ...chapter, content } : chapter
      )
    };
  }

  return project;
}
