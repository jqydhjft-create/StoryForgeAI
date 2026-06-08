import { describe, expect, it } from 'vitest';
import { buildSummary } from '../renderer/services/summaryService';

describe('summaryService', () => {
  it('builds timeline, locations, and character appearances from chapters', () => {
    const summary = buildSummary([
      {
        meta: { id: 1, title: 'Chapel', sceneCount: 1, characters: ['Ash', 'Milo'], locations: ['Ruined Chapel'], timelineDay: 1 },
        content: '# Chapel\n\nAsh finds Milo at dawn.'
      }
    ]);

    expect(summary.timeline[0]).toEqual({ event: 'Chapel', time: 'Day 1', chapter: 1 });
    expect(summary.locations[0].name).toBe('Ruined Chapel');
    expect(summary.characters[0].name).toBe('Ash');
  });
});
