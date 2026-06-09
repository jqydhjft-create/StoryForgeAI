import { describe, expect, it } from 'vitest';
import type { ActTimeline, SceneOutlineArtifact, StoryProject, StoryMemoryState } from '../shared/types';
import { createInitialWorkflowState } from '../shared/workflowDefaults';
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
    summary: { timeline: [], locations: [], characters: [] },
    workflow: createInitialWorkflowState()
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

  it('matches Chinese history fragments from short Unicode keywords', () => {
    const actTimeline: ActTimeline = {
      acts: [
        { id: 'act-1', title: '第一幕', time: '第一天', location: '档案馆', characters: ['米拉'], movement: '寻找账本', summary: '米拉发现账本。' }
      ]
    };
    const sceneOutline: SceneOutlineArtifact = {
      acts: [
        {
          actId: 'act-1',
          summary: '米拉追查账本。',
          chapters: [
            {
              id: 'scene-2',
              actId: 'act-1',
              chapterId: 2,
              target: '揭示 账本',
              scenes: [{ id: 's1', summary: '米拉核对证词。', characters: ['米拉'], location: '档案馆' }],
              anchors: [{ id: 'anchor-1', text: '账本', actId: 'act-1', chapterId: 2 }]
            }
          ]
        }
      ]
    };
    const memory: StoryMemoryState = {
      characterStates: [{ name: '米拉', role: '档案员', status: '警觉' }],
      foreshadowing: [{ id: 'f1', text: '账本', status: 'open' }],
      recentEvents: [{ chapterId: 1, summary: '米拉确认账本仍然有效。' }],
      workingMemory: []
    };

    const packet = buildChapterContextPacket({
      project: project(),
      actTimeline,
      sceneOutline,
      memory,
      actId: 'act-1',
      chapterId: 2
    });

    expect(packet.matchedHistoryFragments).toEqual([
      { source: 'chapter-1', text: '米拉确认账本仍然有效。' }
    ]);
  });

  it('does not mutate source inputs when packet fields change', () => {
    const actTimeline: ActTimeline = {
      acts: [
        { id: 'act-1', title: 'Original Act', time: 'Day 1', location: 'Archive', characters: ['Mira'], movement: 'Find ledger', summary: 'Mira finds the ledger.' }
      ]
    };
    const sceneOutline: SceneOutlineArtifact = {
      acts: [
        {
          actId: 'act-1',
          summary: 'Mira finds the ledger.',
          chapters: [
            {
              id: 'scene-2',
              actId: 'act-1',
              chapterId: 2,
              target: 'Follow the ledger.',
              scenes: [{ id: 's1', summary: 'Mira reads.', characters: ['Mira'], location: 'Archive' }],
              anchors: [{ id: 'anchor-1', text: 'Original anchor', actId: 'act-1', chapterId: 2 }]
            }
          ]
        }
      ]
    };
    const memory: StoryMemoryState = {
      characterStates: [{ name: 'Mira', role: 'Archivist', status: 'Original status' }],
      foreshadowing: [{ id: 'f1', text: 'ledger', status: 'open' }],
      recentEvents: [{ chapterId: 1, summary: 'Mira found the ledger.' }],
      workingMemory: []
    };

    const packet = buildChapterContextPacket({
      project: project(),
      actTimeline,
      sceneOutline,
      memory,
      actId: 'act-1',
      chapterId: 2
    });

    packet.currentActOutline.title = 'Mutated Act';
    packet.anchors[0]!.text = 'Mutated anchor';
    packet.stateMachine.characterStates[0]!.status = 'Mutated status';

    expect(actTimeline.acts[0]!.title).toBe('Original Act');
    expect(sceneOutline.acts[0]!.chapters[0]!.anchors[0]!.text).toBe('Original anchor');
    expect(memory.characterStates[0]!.status).toBe('Original status');
  });
});
