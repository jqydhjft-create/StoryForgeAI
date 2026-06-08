import { useEffect, useState } from 'react';
import type { Language } from '../i18n';
import { t } from '../i18n';
import type { EditableDocument } from '../services/editorDocuments';
import type { TreeSelection } from './ProjectTree';

interface EditorPaneProps {
  language: Language;
  document: EditableDocument | null;
  selection: TreeSelection;
  saveStatus: string;
  onSave: (content: string) => void;
}

export function EditorPane({ language, document, selection, saveStatus, onSave }: EditorPaneProps) {
  const [draft, setDraft] = useState(document?.content ?? '');

  useEffect(() => {
    setDraft(document?.content ?? '');
  }, [document?.relativePath, document?.content]);

  const title =
    selection.kind === 'world'
      ? t(language, 'editor.world')
      : selection.kind === 'plot'
        ? t(language, 'editor.plot')
        : selection.kind === 'export'
          ? t(language, 'editor.exports')
          : document?.title ?? t(language, 'editor.noEditableDocument');

  return (
    <section className="editor-pane">
      <div className="editor-toolbar">
        <h2>{title}</h2>
        {document ? (
          <div className="editor-actions">
            {saveStatus ? <span>{saveStatus}</span> : null}
            <button onClick={() => onSave(draft)}>{t(language, 'editor.save')}</button>
          </div>
        ) : null}
      </div>
      {document ? <textarea value={draft} onChange={(event) => setDraft(event.target.value)} /> : null}
      {!document && selection.kind === 'export' ? (
        <>
          <p>{t(language, 'editor.exportsHint')}</p>
        </>
      ) : null}
      {!document && selection.kind !== 'export' ? <p>{t(language, 'editor.noEditableDocument')}</p> : null}
    </section>
  );
}
