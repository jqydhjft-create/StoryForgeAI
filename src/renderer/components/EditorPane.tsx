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
  onDirtyChange: (dirty: boolean) => void;
  onGenerateChapter?: () => void;
  canGenerateChapter?: boolean;
}

export function EditorPane({
  language,
  document,
  selection,
  saveStatus,
  onSave,
  onDirtyChange,
  onGenerateChapter,
  canGenerateChapter
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
        <div className="editor-toolbar-left">
          <span className="editor-section-kind">{t(language, `tree.kind.${selection.kind}`)}</span>
          <h2>{title}</h2>
        </div>
        {document ? (
          <div className="editor-actions">
            {canGenerateChapter && onGenerateChapter ? (
              <button className="primary" onClick={onGenerateChapter}>{t(language, 'editor.generateChapter')}</button>
            ) : null}
            {saveStatus ? <span className="editor-save-status">{saveStatus}</span> : null}
            {!document.readOnly ? (
              <button className="primary" onClick={() => onSave(draft)}>{t(language, 'editor.save')}</button>
            ) : null}
          </div>
        ) : null}
      </div>
      {document ? (
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} readOnly={document.readOnly} />
      ) : null}
      {!document ? (
        <div className="editor-empty-guide">
          <p>{t(language, 'editor.noEditableDocument')}</p>
          <p className="editor-empty-hint">{t(language, 'editor.emptyHint')}</p>
        </div>
      ) : null}
    </section>
  );
}
