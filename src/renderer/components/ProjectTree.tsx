import type { StoryProject, TreeNodeKind } from '../../shared/types.js';
import type { Language } from '../i18n';
import { t } from '../i18n';

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
}

type TreeItem = TreeSelection & { label: string };

export function ProjectTree({
  language,
  project,
  selection,
  onSelect,
  onAddChapter,
  onAddCharacter,
  onDeleteCharacter
}: ProjectTreeProps) {
  const items: TreeItem[] = [
    { kind: 'world', id: 'bible', label: 'Bible' },
    ...project.characters.map((character) => ({ kind: 'character' as const, id: character.id, label: character.name })),
    { kind: 'plot', id: 'beat_sheet', label: 'Beat Sheet' },
    ...project.chapters.map((chapter) => ({
      kind: 'chapter' as const,
      id: String(chapter.meta.id),
      label: chapter.meta.title
    })),
    { kind: 'export', id: 'summary', label: 'Summary' }
  ];

  return (
    <nav className="project-tree">
      <h2>{project.settings.name}</h2>
      <div className="tree-actions">
        <button onClick={onAddChapter}>{t(language, 'tree.addChapter')}</button>
        <button onClick={onAddCharacter}>{t(language, 'tree.addCharacter')}</button>
        {selection.kind === 'character' ? <button onClick={onDeleteCharacter}>{t(language, 'tree.deleteCharacter')}</button> : null}
      </div>
      {items.map((item) => (
        <button
          key={`${item.kind}-${item.id}`}
          className={selection.kind === item.kind && selection.id === item.id ? 'active' : ''}
          onClick={() => onSelect(item)}
        >
          <span>{t(language, `tree.kind.${item.kind}`)}</span>
          <strong>{item.label}</strong>
        </button>
      ))}
    </nav>
  );
}
