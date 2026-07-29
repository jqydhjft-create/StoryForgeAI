import { useRef, useState } from 'react';
import type { Language } from '../i18n';
import { t } from '../i18n';
import type { StoryProject } from '../../shared/types';

export interface StartScreenProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  projectName: string;
  onProjectNameChange: (name: string) => void;
  storyIdea: string;
  onStoryIdeaChange: (idea: string) => void;
  onCreateProject: () => void;
  onOpenProject?: () => void;
  error: string;
  localProjects?: Array<Pick<StoryProject, 'rootPath' | 'settings'>>;
  onOpenLocalProject?: (rootPath: string) => void;
  onImportProject?: (file: File) => void | Promise<void>;
  onDeleteLocalProject?: (rootPath: string) => void | Promise<void>;
}

export function StartScreen({
  language,
  onLanguageChange,
  projectName,
  onProjectNameChange,
  storyIdea,
  onStoryIdeaChange,
  onCreateProject,
  onOpenProject,
  error,
  localProjects,
  onOpenLocalProject,
  onImportProject,
  onDeleteLocalProject
}: StartScreenProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const deletingProjectPathsRef = useRef(new Set<string>());
  const [localError, setLocalError] = useState('');
  const [deletingProjectPaths, setDeletingProjectPaths] = useState<string[]>([]);

  async function handleImportChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    try {
      if (file && onImportProject) {
        setLocalError('');
        await onImportProject(file);
      }
    } catch {
      setLocalError(t(language, 'start.importProjectFailed'));
    } finally {
      input.value = '';
    }
  }

  async function handleDeleteLocalProject(rootPath: string) {
    if (!onDeleteLocalProject || deletingProjectPathsRef.current.has(rootPath)) return;
    if (!window.confirm(t(language, 'start.confirmDeleteProject'))) return;

    setLocalError('');
    deletingProjectPathsRef.current.add(rootPath);
    setDeletingProjectPaths((paths) => [...paths, rootPath]);
    try {
      await Promise.resolve().then(() => onDeleteLocalProject(rootPath));
    } catch {
      setLocalError(t(language, 'start.deleteProjectFailed'));
    } finally {
      deletingProjectPathsRef.current.delete(rootPath);
      setDeletingProjectPaths((paths) => paths.filter((path) => path !== rootPath));
    }
  }

  return (
    <main className="start-screen">
      <section className="start-panel">
        <label className="language-select">
          <span>{t(language, 'language.label')}</span>
          <select value={language} onChange={(event) => onLanguageChange(event.target.value as Language)}>
            <option value="en">English</option>
            <option value="zh-CN">简体中文</option>
          </select>
        </label>
        <p className="eyebrow">StoryForge AI</p>
        <h1>{t(language, 'start.title')}</h1>
        <label className="project-name-field">
          <span>{t(language, 'start.projectName')}</span>
          <input
            value={projectName}
            placeholder={t(language, 'start.projectNamePlaceholder')}
            onChange={(event) => onProjectNameChange(event.target.value)}
          />
        </label>
        <label className="project-name-field">
          <span>{t(language, 'start.storyIdea')}</span>
          <textarea
            className="start-idea-input"
            value={storyIdea}
            placeholder={t(language, 'start.storyIdeaPlaceholder')}
            onChange={(event) => onStoryIdeaChange(event.target.value)}
            rows={3}
          />
        </label>
        <div className="start-actions">
          <button className="primary" onClick={onCreateProject}>{t(language, 'start.createProject')}</button>
          {onOpenProject ? (
            <button className="secondary" onClick={onOpenProject}>
              {t(language, 'start.openProject')}
            </button>
          ) : null}
        </div>
        {onImportProject ? (
          <>
            <button
              type="button"
              className="secondary start-import-project"
              onClick={() => {
                importInputRef.current?.focus();
                importInputRef.current?.click();
              }}
            >
            {t(language, 'start.importProject')}
            </button>
            <input
              ref={importInputRef}
              hidden
              type="file"
              accept="application/json,.json"
              onChange={(event) => void handleImportChange(event)}
            />
          </>
        ) : null}
        {localProjects !== undefined ? (
          <section className="start-local-projects" aria-label={t(language, 'start.localProjects')}>
            <h2>{t(language, 'start.localProjects')}</h2>
            {localProjects.map((localProject) => (
              <div className="start-local-project" key={localProject.rootPath}>
                {onOpenLocalProject ? (
                  <button className="secondary" onClick={() => onOpenLocalProject(localProject.rootPath)}>
                    {localProject.settings.name}
                  </button>
                ) : <span>{localProject.settings.name}</span>}
                {onDeleteLocalProject ? (
                  <button
                    type="button"
                    className="secondary"
                    disabled={deletingProjectPaths.includes(localProject.rootPath)}
                    onClick={() => void handleDeleteLocalProject(localProject.rootPath)}
                  >
                    {t(language, 'start.deleteProject')}
                  </button>
                ) : null}
              </div>
            ))}
          </section>
        ) : null}
        {error ? <p className="error-text" role="alert">{error}</p> : null}
        {localError ? <p className="error-text" role="alert">{localError}</p> : null}
      </section>
    </main>
  );
}
