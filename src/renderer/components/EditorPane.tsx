import type { StoryProject } from '../../shared/types.js';
import type { Language } from '../i18n';
import { t } from '../i18n';
import type { TreeSelection } from './ProjectTree';

interface EditorPaneProps {
  language: Language;
  project: StoryProject;
  selection: TreeSelection;
}

export function EditorPane({ language, project, selection }: EditorPaneProps) {
  const chapter =
    selection.kind === 'chapter' ? project.chapters.find((item) => String(item.meta.id) === selection.id) : null;

  return (
    <section className="editor-pane">
      {selection.kind === 'world' ? (
        <>
          <h2>{t(language, 'editor.world')}</h2>
          <textarea value={JSON.stringify(project.world, null, 2)} readOnly />
        </>
      ) : null}
      {selection.kind === 'character' ? (
        <>
          <h2>{t(language, 'editor.character')}</h2>
          <textarea value={JSON.stringify(project.characters.find((item) => item.id === selection.id), null, 2)} readOnly />
        </>
      ) : null}
      {selection.kind === 'plot' ? (
        <>
          <h2>{t(language, 'editor.plot')}</h2>
          <textarea value={JSON.stringify(project.plot, null, 2)} readOnly />
        </>
      ) : null}
      {chapter ? (
        <>
          <h2>{chapter.meta.title}</h2>
          <textarea value={chapter.content} readOnly />
        </>
      ) : null}
      {selection.kind === 'export' ? (
        <>
          <h2>{t(language, 'editor.exports')}</h2>
          <p>{t(language, 'editor.exportsHint')}</p>
        </>
      ) : null}
    </section>
  );
}
