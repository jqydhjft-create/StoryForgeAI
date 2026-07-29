import { describe, expect, it } from 'vitest';
import {
  normalizeActScoreReport,
  normalizeActTimeline,
  normalizeInitialSettingBook,
  normalizeSceneOutline,
  normalizeWorldOutline
} from '../renderer/services/workflowArtifacts';

describe('workflowArtifacts', () => {
  it('normalizes stage artifacts from plugin output', () => {
    expect(
      normalizeInitialSettingBook({
        genre: 'Mystery',
        worldPremise: 'Memories are stored in ledgers.',
        protagonist: 'Mira',
        coreConflict: 'Truth versus survival',
        readerFeeling: 'Uneasy wonder',
        targetLength: '80k words',
        requiredElements: ['archives']
      }).genre
    ).toBe('Mystery');

    expect(normalizeWorldOutline({ worldDocument: 'World', masterOutline: 'Outline' }).masterOutline).toBe('Outline');
    expect(
      normalizeActTimeline({
        acts: [
          {
            id: 'act-1',
            title: 'Opening',
            time: 'Day 1',
            location: 'Archive',
            characters: ['Mira'],
            movement: 'Find ledger',
            summary: 'Mira finds the ledger.'
          }
        ]
      }).acts[0].id
    ).toBe('act-1');
    expect(
      normalizeSceneOutline({ acts: [{ actId: 'act-1', summary: 'Opening act', chapters: [] }] }).acts[0].actId
    ).toBe('act-1');
    expect(
      normalizeActScoreReport({
        actId: 'act-1',
        plotContinuity: 8,
        characterConsistency: 7,
        pacingControl: 6,
        detailRichness: 8,
        comment: 'Solid.'
      }).plotContinuity
    ).toBe(8);
  });

  it('rejects malformed artifacts with clear errors', () => {
    expect(() => normalizeInitialSettingBook({ genre: 'Mystery' })).toThrow('Invalid initial setting book');
    expect(() => normalizeActTimeline({ acts: [{ id: 'act-1' }] })).toThrow('Invalid act timeline');
    expect(() => normalizeActScoreReport({ actId: 'act-1', plotContinuity: 11 })).toThrow('Invalid act score');
  });

  it('rejects scene outlines that reuse a chapter ID in a later act', () => {
    expect(() => normalizeSceneOutline({
      acts: [
        {
          actId: 'act-1',
          summary: 'Opening act',
          chapters: [{ id: 'chapter-1-1', actId: 'act-1', chapterId: 1, target: 'Open', scenes: [], anchors: [] }]
        },
        {
          actId: 'act-2',
          summary: 'Closing act',
          chapters: [{ id: 'chapter-2-1', actId: 'act-2', chapterId: 1, target: 'Close', scenes: [], anchors: [] }]
        }
      ]
    })).toThrow('Scene outline chapter IDs must be globally unique');
  });
});
