import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { WorkflowArtifactPreview } from '../renderer/components/WorkflowArtifactPreview';

function renderPreview(stage: Parameters<typeof WorkflowArtifactPreview>[0]['stage'], artifact: unknown): string {
  return renderToStaticMarkup(createElement(WorkflowArtifactPreview, { language: 'en', stage, artifact }));
}

describe('WorkflowArtifactPreview', () => {
  it('renders world and outline fields as readable sections', () => {
    const html = renderPreview('world_outline', {
      worldDocument: 'Memory can be traded.',
      masterOutline: 'Mira investigates her own past.'
    });

    expect(html).toContain('World document');
    expect(html).toContain('Memory can be traded.');
    expect(html).toContain('Master outline');
    expect(html).not.toContain('&quot;worldDocument&quot;');
  });

  it('renders character cards from the character bible', () => {
    const html = renderPreview('character_bible', [{
      id: 'mira',
      name: 'Mira',
      role: 'Archivist',
      motivation: 'Find the ledger',
      flaw: 'Distrust',
      arc: 'Learns trust'
    }]);

    expect(html).toContain('Mira');
    expect(html).toContain('Archivist');
    expect(html).toContain('Find the ledger');
  });

  it('shows chapter review issues and blocked review context', () => {
    const html = renderPreview('chapter_draft', {
      chapter: { meta: { title: 'Chapter 1' }, content: 'Draft text' },
      review: {
        status: 'issues_found',
        summary: 'Continuity issue',
        issues: [{ id: 'i1', severity: 'error', message: 'Contradiction' }]
      },
      saveDecision: 'blocked_by_review'
    });

    expect(html).toContain('Chapter 1');
    expect(html).toContain('Continuity issue');
    expect(html).toContain('Contradiction');
  });

  it('uses a safe empty state for missing or malformed artifacts', () => {
    const html = renderPreview('scene_outline', { unexpected: true });

    expect(html).toContain('No stage output yet');
    expect(html).not.toContain('unexpected');
  });
});
