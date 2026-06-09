import type { StoryProject, TreeNodeKind } from '../../shared/types.js';
import type { Language } from '../i18n';
import { t } from '../i18n';
import { countProjectCharacters, countTextCharacters } from '../services/textMetrics';

export interface TreeSelection {
  kind: TreeNodeKind;
  id: string;
}

interface ProjectTreeProps {
  language: Language;
  project: StoryProject;
  selection: TreeSelection;
  onSelect: (selection: TreeSelection) => void;
  onAddChapter: () => void;
  onAddCharacter: () => void;
  onDeleteCharacter: () => void;
  onDeleteChapter: () => void;
}

type TreeItem = TreeSelection & { label: string; detail?: string };

export function ProjectTree({
  language,
  project,
  selection,
  onSelect,
  onAddChapter,
  onAddCharacter,
  onDeleteCharacter,
  onDeleteChapter
}: ProjectTreeProps) {
  const rootItems: TreeItem[] = [
    { kind: 'world', id: 'bible', label: 'Bible' },
    { kind: 'plot', id: 'beat_sheet', label: 'Beat Sheet' }
  ];
  const characterItems: TreeItem[] = project.characters.map((character) => ({
    kind: 'character' as const,
    id: character.id,
    label: character.name,
    detail: character.role
  }));
  const chapterItems: TreeItem[] = project.chapters.map((chapter) => ({
    kind: 'chapter' as const,
    id: String(chapter.meta.id),
    label: chapter.meta.title,
    detail: `${countTextCharacters(chapter.content)} chars`
  }));
  const summaryItem: TreeItem = { kind: 'summary', id: 'summary', label: 'Summary', detail: `${countProjectCharacters(project)} chars` };

  function renderItem(item: TreeItem) {
    return (
      <button
        key={`${item.kind}-${item.id}`}
        className={selection.kind === item.kind && selection.id === item.id ? 'active' : ''}
        onClick={() => onSelect(item)}
      >
        <span>{t(language, `tree.kind.${item.kind}`)}</span>
        <strong>{item.label}</strong>
        {item.detail ? <em>{item.detail}</em> : null}
      </button>
    );
  }

  return (
    <nav className="project-tree">
      <h2>{project.settings.name}</h2>
      <div className="tree-actions">
        <button onClick={onAddChapter}>{t(language, 'tree.addChapter')}</button>
        <button onClick={onAddCharacter}>{t(language, 'tree.addCharacter')}</button>
        {selection.kind === 'character' ? <button onClick={onDeleteCharacter}>{t(language, 'tree.deleteCharacter')}</button> : null}
        {selection.kind === 'chapter' ? <button onClick={onDeleteChapter}>{t(language, 'tree.deleteChapter')}</button> : null}
      </div>
      {rootItems.map(renderItem)}
      <section className="tree-group">
        <h3>{t(language, 'tree.kind.character')}</h3>
        {characterItems.map(renderItem)}
      </section>
      <section className="tree-group">
        <h3>{t(language, 'tree.kind.chapter')}</h3>
        {chapterItems.map(renderItem)}
      </section>
      {renderItem(summaryItem)}
    </nav>
  );
}
