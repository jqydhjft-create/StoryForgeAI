import type { Language } from '../i18n';

interface IntakeConfirmationProps {
  language: Language;
  idea: string;
  draft: unknown;
  isBusy: boolean;
  statusText: string;
  error: string;
  onConfirm: () => void;
  onRegenerate: () => void;
  onEditIdea: () => void;
}

export function IntakeConfirmation({
  idea,
  draft,
  isBusy,
  statusText,
  error,
  onConfirm,
  onRegenerate,
  onEditIdea
}: IntakeConfirmationProps) {
  return (
    <section className="intake-confirmation">
      <div className="intake-confirmation-card">
        <p className="eyebrow">Creative workflow · intake</p>
        <h2>Confirm your creative brief</h2>
        <p className="intake-confirmation-idea">{idea}</p>
        <pre className="intake-confirmation-artifact">{JSON.stringify(draft, null, 2)}</pre>
        <div className="intake-confirmation-actions">
          <button className="primary" onClick={onConfirm} disabled={isBusy}>Confirm and enter workspace</button>
          <button onClick={onRegenerate} disabled={isBusy}>Regenerate</button>
          <button className="secondary" onClick={onEditIdea} disabled={isBusy}>Edit idea</button>
        </div>
        {statusText ? <p className="status-text">{statusText}</p> : null}
        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </section>
  );
}
