import type { ModelRunStatus } from './workspaceModel';
import type { Language } from '../i18n.js';
import { t } from '../i18n.js';

export interface ModelRunCardProps {
  language?: Language;
  status: ModelRunStatus;
  stageLabel: string;
  elapsedSeconds: number;
  message: string;
  errorText: string;
  canRetry: boolean;
  onRetry: () => void;
  onToggle: () => void;
  expanded?: boolean;
}

function statusLabel(language: Language, status: ModelRunStatus): string {
  switch (status) {
    case 'running':
      return t(language, 'workspace.running');
    case 'success':
      return t(language, 'workspace.ready');
    case 'error':
      return t(language, 'workspace.error');
    case 'idle':
      return t(language, 'workspace.idle');
  }
}

export function ModelRunCard({
  language = 'en',
  status,
  stageLabel,
  elapsedSeconds,
  message,
  errorText,
  canRetry,
  onRetry,
  onToggle,
  expanded = true
}: ModelRunCardProps) {
  const announcement = status === 'running'
    ? `${stageLabel}. ${message || t(language, 'workspace.workingInBackground')}`
    : '';
  const visibleMessage = status === 'error'
    ? errorText || message
    : message;

  return (
    <section className={`model-run-card${expanded ? '' : ' compact'}`} data-run-status={status}>
      <div className="model-run-card-header">
        <div>
          <span className="model-run-status-badge">{statusLabel(language, status)}</span>
          {expanded ? <strong>{stageLabel}</strong> : null}
          {!expanded && status === 'running' ? (
            <span className="model-run-compact-elapsed" aria-live="off">{t(language, 'workspace.elapsed')} {elapsedSeconds}s</span>
          ) : null}
        </div>
        <button
          type="button"
          className="model-run-toggle"
          aria-expanded={expanded}
          aria-label={t(language, expanded ? 'workspace.collapseRail' : 'workspace.expandRail')}
          onClick={onToggle}
        >
          <span aria-hidden="true">{expanded ? '›' : '‹'}</span>
        </button>
      </div>

      {expanded ? (
        <div className="model-run-card-body">
          {status === 'running' ? (
            <>
              <p role="status">{announcement}</p>
              <p className="model-run-elapsed" aria-live="off">{t(language, 'workspace.elapsed')} {elapsedSeconds}s</p>
              <p className="model-run-nonblocking">{t(language, 'workspace.workingInBackground')}</p>
            </>
          ) : null}
          {status === 'error' ? (
            <>
              <p className="model-run-error" role="alert">{visibleMessage || t(language, 'workspace.modelTaskFailed')}</p>
              <p className="model-run-elapsed" aria-live="off">{t(language, 'workspace.elapsed')} {elapsedSeconds}s</p>
              {errorText ? <details><summary>{t(language, 'workspace.technicalDetails')}</summary><p>{errorText}</p></details> : null}
            </>
          ) : null}
          {status === 'idle' || status === 'success' ? (
            <>{visibleMessage ? <p>{visibleMessage}</p> : null}{status === 'success' ? <p className="model-run-elapsed" aria-live="off">{t(language, 'workspace.elapsed')} {elapsedSeconds}s</p> : null}</>
          ) : null}
          {status === 'error' && canRetry ? (
            <button type="button" data-action="retry" onClick={onRetry}>{t(language, 'workspace.retry')}</button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
