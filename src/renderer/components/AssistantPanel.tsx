import type { StoryProject, SummaryData } from '../../shared/types.js';
import type { Language } from '../i18n';
import { formatCount, t } from '../i18n';
import { buildNovelExport, buildSummaryExport } from '../services/exportService';
import { IdeaWizard } from './IdeaWizard';
import type { StorySeed } from '../services/mockAiService';

interface AssistantPanelProps {
  language: Language;
  project: StoryProject;
  summary: SummaryData;
  onRefreshSummary: () => void;
  onSeed: (seed: StorySeed) => void;
  exportStatus: string;
  onWriteExports: () => void;
  onOpenExportsFolder: () => void;
}

export function AssistantPanel({
  language,
  project,
  summary,
  onRefreshSummary,
  onSeed,
  exportStatus,
  onWriteExports,
  onOpenExportsFolder
}: AssistantPanelProps) {
  const novelExport = buildNovelExport(project.settings.name, project.chapters);
  const summaryExport = buildSummaryExport(summary);

  return (
    <aside className="assistant-panel">
      <IdeaWizard language={language} onGenerated={onSeed} />
      <section>
        <h3>{t(language, 'assistant.review')}</h3>
        <p>{t(language, 'assistant.reviewOk')}</p>
      </section>
      <section>
        <h3>{t(language, 'assistant.summary')}</h3>
        <button onClick={onRefreshSummary}>{t(language, 'assistant.refreshSummary')}</button>
        <p>{formatCount(language, 'summary.timelineEntries', summary.timeline.length)}</p>
        <p>{formatCount(language, 'summary.locations', summary.locations.length)}</p>
        <p>{formatCount(language, 'summary.characters', summary.characters.length)}</p>
      </section>
      <section>
        <h3>{t(language, 'assistant.exportPreview')}</h3>
        <div className="export-actions">
          <button onClick={onWriteExports}>{t(language, 'assistant.writeExports')}</button>
          <button onClick={onOpenExportsFolder}>{t(language, 'assistant.openExportsFolder')}</button>
          {exportStatus ? <span>{exportStatus}</span> : null}
        </div>
        <textarea value={`${novelExport}\n\n${summaryExport}`} readOnly />
      </section>
    </aside>
  );
}
