import type { StoryProject, SummaryData } from '../../shared/types.js';
import { buildNovelExport, buildSummaryExport } from '../services/exportService';
import { buildSummary } from '../services/summaryService';
import { IdeaWizard } from './IdeaWizard';
import type { StorySeed } from '../services/mockAiService';

interface AssistantPanelProps {
  project: StoryProject;
  summary: SummaryData;
  onSummary: (summary: SummaryData) => void;
  onSeed: (seed: StorySeed) => void;
}

export function AssistantPanel({ project, summary, onSummary, onSeed }: AssistantPanelProps) {
  const novelExport = buildNovelExport(project.settings.name, project.chapters);
  const summaryExport = buildSummaryExport(summary);

  return (
    <aside className="assistant-panel">
      <IdeaWizard onGenerated={onSeed} />
      <section>
        <h3>Review</h3>
        <p>No continuity warnings in the current mock review.</p>
      </section>
      <section>
        <h3>Summary</h3>
        <button onClick={() => onSummary(buildSummary(project.chapters))}>Refresh summary</button>
        <p>{summary.timeline.length} timeline entries</p>
        <p>{summary.locations.length} locations</p>
        <p>{summary.characters.length} characters</p>
      </section>
      <section>
        <h3>Export preview</h3>
        <textarea value={`${novelExport}\n\n${summaryExport}`} readOnly />
      </section>
    </aside>
  );
}
