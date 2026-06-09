import { useState } from 'react';
import type { Language } from '../i18n';
import { t } from '../i18n';
import { runStoryWorkflow, type StoryWorkflowResult } from '../services/storyWorkflow';
import { initialIdeaDraft } from '../services/startupDefaults';

interface IdeaWizardProps {
  language: Language;
  onGenerated: (workflow: StoryWorkflowResult) => void;
}

export function IdeaWizard({ language, onGenerated }: IdeaWizardProps) {
  const [idea, setIdea] = useState(initialIdeaDraft);
  const [isGenerating, setIsGenerating] = useState(false);

  async function generateWorkflow() {
    if (isGenerating || !idea.trim()) return;

    setIsGenerating(true);
    try {
      onGenerated(await runStoryWorkflow({ idea }));
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="idea-wizard">
      <h3>{t(language, 'assistant.idea')}</h3>
      <textarea value={idea} onChange={(event) => setIdea(event.target.value)} disabled={isGenerating} />
      <button onClick={generateWorkflow} disabled={isGenerating || !idea.trim()}>
        {t(language, isGenerating ? 'assistant.generating' : 'assistant.generate')}
      </button>
    </section>
  );
}
