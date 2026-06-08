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
}

export function ProjectTree({ language, project, selection, onSelect }: ProjectTreeProps) {
  const items: TreeSelection[] = [
    { kind: 'world', id: 'bible' },
    ...project.characters.map((character) => ({ kind: 'character' as const, id: character.id })),
    { kind: 'plot', id: 'beat_sheet' },
    ...project.chapters.map((chapter) => ({ kind: 'chapter' as const, id: String(chapter.meta.id) })),
    { kind: 'export', id: 'summary' }
  ];

  return (
    <nav className="project-tree">
      <h2>{project.settings.name}</h2>
      {items.map((item) => (
        <button
          key={`${item.kind}-${item.id}`}
          className={selection.kind === item.kind && selection.id === item.id ? 'active' : ''}
          onClick={() => onSelect(item)}
        >
          <span>{t(language, `tree.kind.${item.kind}`)}</span>
          <strong>{item.id}</strong>
        </button>
      ))}
    </nav>
  );
}
