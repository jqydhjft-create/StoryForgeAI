import type { StoryProject } from '../../shared/types.js';
import type { TreeSelection } from './ProjectTree';

interface EditorPaneProps {
  project: StoryProject;
  selection: TreeSelection;
}

export function EditorPane({ project, selection }: EditorPaneProps) {
  const chapter =
    selection.kind === 'chapter' ? project.chapters.find((item) => String(item.meta.id) === selection.id) : null;

  return (
    <section className="editor-pane">
      {selection.kind === 'world' ? (
        <>
          <h2>World Bible</h2>
          <textarea value={JSON.stringify(project.world, null, 2)} readOnly />
        </>
      ) : null}
      {selection.kind === 'character' ? (
        <>
          <h2>Character</h2>
          <textarea value={JSON.stringify(project.characters.find((item) => item.id === selection.id), null, 2)} readOnly />
        </>
      ) : null}
      {selection.kind === 'plot' ? (
        <>
          <h2>Beat Sheet</h2>
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
          <h2>Exports</h2>
          <p>Use the assistant panel to build novel and summary exports.</p>
        </>
      ) : null}
    </section>
  );
}
