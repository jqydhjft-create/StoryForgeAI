import type { Language } from '../i18n';
import { t } from '../i18n';

interface StartScreenProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
  onCreateDemo: () => void;
  onOpenProject: () => void;
  error: string;
}

export function StartScreen({ language, onLanguageChange, onCreateDemo, onOpenProject, error }: StartScreenProps) {
  return (
    <main className="start-screen">
      <section className="start-panel">
        <label className="language-select">
          <span>{t(language, 'language.label')}</span>
          <select value={language} onChange={(event) => onLanguageChange(event.target.value as Language)}>
            <option value="en">{t(language, 'language.english')}</option>
            <option value="zh-CN">{t(language, 'language.chinese')}</option>
          </select>
        </label>
        <p className="eyebrow">StoryForge AI</p>
        <h1>{t(language, 'start.title')}</h1>
        <div className="start-actions">
          <button onClick={onCreateDemo}>{t(language, 'start.createDemo')}</button>
          <button className="secondary" onClick={onOpenProject}>
            {t(language, 'start.openProject')}
          </button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </section>
    </main>
  );
}
