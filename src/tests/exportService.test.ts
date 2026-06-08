import { describe, expect, it } from 'vitest';
import { buildNovelExport, buildSummaryExport } from '../renderer/services/exportService';

describe('exportService', () => {
  it('merges chapters into novel text', () => {
    const text = buildNovelExport('Ash Road', [
      { meta: { id: 1, title: 'Chapel', sceneCount: 1, characters: [], locations: [], timelineDay: 1 }, content: '# Chapel\n\nOpening.' }
    ]);

    expect(text).toContain('# Ash Road');
    expect(text).toContain('Opening.');
  });

  it('formats summary data as markdown', () => {
    const text = buildSummaryExport({
      timeline: [{ event: 'Chapel', time: 'Day 1', chapter: 1 }],
      locations: [{ name: 'Ruined Chapel', firstAppearance: 'Chapter 1', scenes: ['Chapter 1'] }],
      characters: [{ name: 'Ash', firstChapter: 1, lastChapter: 1, statusChange: 'Introduced' }]
    });

    expect(text).toContain('## Timeline');
    expect(text).toContain('| Day 1 | Chapel | 1 |');
  });
});
