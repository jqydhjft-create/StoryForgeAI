import { useState } from 'react';
import type { Language } from '../i18n';
import { t } from '../i18n';
import { generateStorySeed } from '../services/mockAiService';
import type { StorySeed } from '../services/mockAiService';

interface IdeaWizardProps {
  language: Language;
  onGenerated: (seed: StorySeed) => void;
}

export function IdeaWizard({ language, onGenerated }: IdeaWizardProps) {
  const [idea, setIdea] = useState('A retired knight protects an orphan in the wasteland.');

  return (
    <section className="idea-wizard">
      <h3>{t(language, 'assistant.idea')}</h3>
      <textarea value={idea} onChange={(event) => setIdea(event.target.value)} />
      <button onClick={() => onGenerated(generateStorySeed(idea))}>{t(language, 'assistant.generate')}</button>
    </section>
  );
}
