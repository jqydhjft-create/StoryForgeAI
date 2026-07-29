import type { CharacterProfile, PlotBeat, StoryProject, TreeNodeKind, WorldBible } from '../../shared/types.js';
import { buildSummaryExport } from './exportService';
import { countProjectCharacters } from './textMetrics';

export interface EditorSelection {
  kind: TreeNodeKind;
  id: string;
}

export interface EditableDocument {
  title: string;
  relativePath: string;
  content: string;
  readOnly?: boolean;
}

function formatChapterPath(id: number): string {
  return `chapters/${String(id).padStart(2, '0')}.md`;
}

function formatCharacterPath(id: string): string {
  return `characters/${id}.json`;
}

function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function formatWorldOutline(worldDocument: string, masterOutline: string): string {
  return `# World Outline\n\n## World\n\n${worldDocument}\n\n## Master Outline\n\n${masterOutline}\n`;
}

function formatActTimeline(act: NonNullable<StoryProject['workflow']['artifacts']['actTimeline']>['acts'][number]): string {
  return `# ${act.title}\n\n- Time: ${act.time}\n- Location: ${act.location}\n- Characters: ${act.characters.join(', ')}\n\n## Movement\n\n${act.movement}\n\n## Summary\n\n${act.summary}\n`;
}

function formatSceneOutline(chapter: NonNullable<StoryProject['workflow']['artifacts']['sceneOutline']>['acts'][number]['chapters'][number]): string {
  const scenes = chapter.scenes.map((scene, index) =>
    `### Scene ${index + 1}\n\n${scene.summary}\n\n- Characters: ${scene.characters.join(', ')}\n- Location: ${scene.location}`
  ).join('\n\n');
  const anchors = chapter.anchors.map((anchor) => `- ${anchor.text}`).join('\n');
  return `# Chapter ${chapter.chapterId} Outline\n\n## Target\n\n${chapter.target}\n\n## Scenes\n\n${scenes}\n\n## Anchors\n\n${anchors}\n`;
}

export function getEditableDocument(project: StoryProject, selection: EditorSelection): EditableDocument | null {
  if (selection.kind === 'world') {
    const outline = project.workflow.artifacts.worldOutline;
    if (outline) {
      return {
        title: 'World Outline',
        relativePath: 'workflow/world-outline.md',
        content: formatWorldOutline(outline.worldDocument, outline.masterOutline),
        readOnly: true
      };
    }
    return {
      title: 'World Bible',
      relativePath: 'world/bible.json',
      content: formatJson(project.world)
    };
  }

  if (selection.kind === 'plot') {
    const act = project.workflow.artifacts.actTimeline?.acts.find((item) => item.id === selection.id);
    if (act) {
      return {
        title: act.title,
        relativePath: `workflow/acts/${act.id}.md`,
        content: formatActTimeline(act),
        readOnly: true
      };
    }
    return {
      title: 'Beat Sheet',
      relativePath: 'plot/beat_sheet.json',
      content: formatJson(project.plot)
    };
  }

  if (selection.kind === 'character') {
    const character = project.characters.find((item) => item.id === selection.id);
    if (!character) return null;

    return {
      title: character.name,
      relativePath: formatCharacterPath(character.id),
      content: formatJson(character)
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

  if (selection.kind === 'scene_outline') {
    const chapter = project.workflow.artifacts.sceneOutline?.acts
      .flatMap((act) => act.chapters)
      .find((item) => item.id === selection.id);
    if (!chapter) return null;

    return {
      title: `Chapter ${chapter.chapterId} Outline`,
      relativePath: `workflow/scene-outline/${chapter.id}.md`,
      content: formatSceneOutline(chapter),
      readOnly: true
    };
  }

  if (selection.kind === 'summary') {
    return {
      title: 'Story Summary',
      relativePath: 'chapters/meta.json',
      content: `Total characters: ${countProjectCharacters(project)}\n\n${buildSummaryExport(project.summary)}`,
      readOnly: true
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

  if (selection.kind === 'character') {
    const nextCharacter = JSON.parse(content) as CharacterProfile;
    return {
      ...project,
      characters: project.characters.map((character) => (character.id === selection.id ? nextCharacter : character))
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
