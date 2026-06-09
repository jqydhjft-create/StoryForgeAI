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
  canRegenerateChapter: boolean;
  canRollbackChapter: boolean;
  onSave: (content: string) => void;
  onDirtyChange: (dirty: boolean) => void;
  onRegenerateChapter: () => void;
  onRollbackChapter: () => void;
}

export function EditorPane({
  language,
  document,
  selection,
  saveStatus,
  canRegenerateChapter,
  canRollbackChapter,
  onSave,
  onDirtyChange,
  onRegenerateChapter,
  onRollbackChapter
}: EditorPaneProps) {
  const [draft, setDraft] = useState(document?.content ?? '');

  useEffect(() => {
    setDraft(document?.content ?? '');
  }, [document?.relativePath, document?.content]);

  useEffect(() => {
    onDirtyChange(Boolean(document && !document.readOnly && draft !== document.content));
  }, [document, draft, onDirtyChange]);

  const title =
    selection.kind === 'world'
      ? t(language, 'editor.world')
      : selection.kind === 'plot'
        ? t(language, 'editor.plot')
        : selection.kind === 'summary'
          ? t(language, 'editor.summary')
          : document?.title ?? t(language, 'editor.noEditableDocument');

  return (
    <section className="editor-pane">
      <div className="editor-toolbar">
        <h2>{title}</h2>
        {document ? (
          <div className="editor-actions">
            {saveStatus ? <span>{saveStatus}</span> : null}
            {selection.kind === 'chapter' ? (
              <>
                <button onClick={onRegenerateChapter} disabled={!canRegenerateChapter}>
                  {t(language, 'editor.regenerateChapter')}
                </button>
                <button onClick={onRollbackChapter} disabled={!canRollbackChapter}>
                  {t(language, 'editor.rollbackChapter')}
                </button>
              </>
            ) : null}
            {!document.readOnly ? <button onClick={() => onSave(draft)}>{t(language, 'editor.save')}</button> : null}
          </div>
        ) : null}
      </div>
      {document ? (
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} readOnly={document.readOnly} />
      ) : null}
      {!document ? <p>{t(language, 'editor.noEditableDocument')}</p> : null}
    </section>
  );
}
