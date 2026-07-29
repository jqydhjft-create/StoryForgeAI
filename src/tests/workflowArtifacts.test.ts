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

  it('resequences repeated model chapter IDs globally and keeps matching anchors aligned', () => {
    const outline = normalizeSceneOutline({
      acts: [
        {
          actId: 'act-1',
          summary: 'Opening act',
          chapters: [{
            id: 'chapter-1-1',
            actId: 'act-1',
            chapterId: 1,
            target: 'Open',
            scenes: [],
            anchors: [
              { id: 'anchor-1', text: 'Opening promise', actId: 'act-1', chapterId: 1 },
              { id: 'anchor-external', text: 'Later payoff', actId: 'act-2', chapterId: 1 }
            ]
          }]
        },
        {
          actId: 'act-2',
          summary: 'Closing act',
          chapters: [{
            id: 'chapter-2-1',
            actId: 'act-2',
            chapterId: 1,
            target: 'Close',
            scenes: [],
            anchors: [{ id: 'anchor-2', text: 'Closing payoff', actId: 'act-2', chapterId: 1 }]
          }]
        }
      ]
    });

    expect(outline.acts.flatMap((act) => act.chapters.map((chapter) => chapter.chapterId))).toEqual([1, 2]);
    expect(outline.acts[0]?.chapters[0]?.anchors).toEqual([
      { id: 'anchor-1', text: 'Opening promise', actId: 'act-1', chapterId: 1 },
      { id: 'anchor-external', text: 'Later payoff', actId: 'act-2', chapterId: 1 }
    ]);
    expect(outline.acts[1]?.chapters[0]?.anchors).toEqual([
      { id: 'anchor-2', text: 'Closing payoff', actId: 'act-2', chapterId: 2 }
    ]);
  });

  it('rejects structurally invalid scene outlines', () => {
    expect(() => normalizeSceneOutline({
      acts: [{ actId: 'act-1', summary: 'Opening act', chapters: [{ id: 'chapter-1', actId: 'act-1', chapterId: 1, target: 'Open', scenes: 'not-an-array', anchors: [] }] }]
    })).toThrow('Invalid scene outline');
  });
});
