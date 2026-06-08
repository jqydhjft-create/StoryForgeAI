interface StartScreenProps {
  onCreateDemo: () => void;
  onOpenProject: () => void;
  error: string;
}

export function StartScreen({ onCreateDemo, onOpenProject, error }: StartScreenProps) {
  return (
    <main className="start-screen">
      <section className="start-panel">
        <p className="eyebrow">StoryForge AI</p>
        <h1>Desktop story workspace</h1>
        <div className="start-actions">
          <button onClick={onCreateDemo}>Create demo project</button>
          <button className="secondary" onClick={onOpenProject}>
            Open project
          </button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </section>
    </main>
  );
}
