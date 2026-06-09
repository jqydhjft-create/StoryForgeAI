import { describe, expect, it } from 'vitest';
import type { ActTimeline, SceneOutlineArtifact, StoryProject, StoryMemoryState } from '../shared/types';
import { buildChapterContextPacket } from '../renderer/services/chapterContext';

function project(): StoryProject {
  return {
    rootPath: '',
    settings: { name: 'Archive Story', createdAt: '2026-06-09T00:00:00.000Z', reviewStrictness: 'medium' },
    world: { genre: 'Mystery', premise: 'A city stores memories in ledgers.', rules: ['Witness records matter.'], terms: {} },
    characters: [],
    plot: [],
    chapters: [
      { meta: { id: 1, title: 'Chapter 1', sceneCount: 1, characters: ['Mira'], locations: ['Archive'], timelineDay: 1 }, content: '# Chapter 1\n\nFirst text.' },
      { meta: { id: 2, title: 'Chapter 2', sceneCount: 1, characters: ['Mira'], locations: ['Archive'], timelineDay: 2 }, content: '# Chapter 2\n\nSecond text.' },
      { meta: { id: 3, title: 'Chapter 3', sceneCount: 1, characters: ['Mira'], locations: ['Vault'], timelineDay: 3 }, content: '# Chapter 3\n\nThird text.' }
    ],
    summary: { timeline: [], locations: [], characters: [] }
  };
}

describe('chapterContext', () => {
  it('builds the strict packet without full project text or full world document', () => {
    const actTimeline: ActTimeline = {
      acts: [
        { id: 'act-1', title: 'Act 1', time: 'Day 1-3', location: 'Archive', characters: ['Mira'], movement: 'Find ledger', summary: 'Mira finds the ledger.' },
        { id: 'act-2', title: 'Act 2', time: 'Day 4-6', location: 'Vault', characters: ['Mira'], movement: 'Open vault', summary: 'Mira opens the vault.' }
      ]
    };
    const sceneOutline: SceneOutlineArtifact = {
      acts: [
        {
          actId: 'act-2',
          summary: 'Mira opens the vault.',
          chapters: [
            {
              id: 'scene-4',
              actId: 'act-2',
              chapterId: 4,
              target: 'Reveal what the vault protects.',
              scenes: [{ id: 's1', summary: 'Mira enters the vault.', characters: ['Mira'], location: 'Vault' }],
              anchors: [{ id: 'anchor-1', text: 'Echo Act 1 Chapter 1: ledger witness', actId: 'act-2', chapterId: 4 }]
            }
          ]
        }
      ]
    };
    const memory: StoryMemoryState = {
      characterStates: [{ name: 'Mira', role: 'Archivist', status: 'Determined' }],
      foreshadowing: [{ id: 'f1', text: 'ledger witness', status: 'open' }],
      recentEvents: [
        { chapterId: 1, summary: 'Mira found the ledger.' },
        { chapterId: 2, summary: 'Mira hid the ledger.' },
        { chapterId: 3, summary: 'Mira reached the vault.' }
      ],
      workingMemory: ['Witness records matter.']
    };

    const packet = buildChapterContextPacket({
      project: project(),
      actTimeline,
      sceneOutline,
      memory,
      actId: 'act-2',
      chapterId: 4
    });

    expect(packet.currentChapterTarget).toBe('Reveal what the vault protects.');
    expect(packet.currentActOutline.id).toBe('act-2');
    expect(packet.anchors).toHaveLength(1);
    expect(packet.recentChapterTexts.map((chapter) => chapter.id)).toEqual([2, 3]);
    expect(packet.previousActSummary).toBe('Mira finds the ledger.');
    expect(packet.currentActSummary).toBe('Mira opens the vault.');
    expect(packet.matchedHistoryFragments[0].text).toContain('ledger');
    expect(JSON.stringify(packet)).not.toContain('A city stores memories in ledgers.');
  });
});
