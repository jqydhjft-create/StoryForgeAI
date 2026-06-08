import { useState } from 'react';
import { generateStorySeed } from '../services/mockAiService';
import type { StorySeed } from '../services/mockAiService';

interface IdeaWizardProps {
  onGenerated: (seed: StorySeed) => void;
}

export function IdeaWizard({ onGenerated }: IdeaWizardProps) {
  const [idea, setIdea] = useState('A retired knight protects an orphan in the wasteland.');

  return (
    <section className="idea-wizard">
      <h3>Idea to story</h3>
      <textarea value={idea} onChange={(event) => setIdea(event.target.value)} />
      <button onClick={() => onGenerated(generateStorySeed(idea))}>Generate starter assets</button>
    </section>
  );
}
