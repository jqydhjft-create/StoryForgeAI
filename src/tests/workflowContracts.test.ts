import { describe, expect, it } from 'vitest';
import type {
  ActTimeline,
  ChapterContextPacket,
  StoryPluginCapability,
  StoryWorkflowState
} from '../shared/types';

describe('workflow contracts', () => {
  it('describes the seven-stage workflow state with confirmation status', () => {
    const state: StoryWorkflowState = {
      currentStage: 'intake',
      stages: {
        intake: { status: 'draft' },
        world_outline: { status: 'locked' },
        act_timeline: { status: 'locked' },
        scene_outline: { status: 'locked' },
        chapter_draft: { status: 'locked' },
        act_scoring: { status: 'locked' },
        full_review: { status: 'optional' }
      },
      artifacts: {},
      memory: {
        characterStates: [],
        foreshadowing: [],
        recentEvents: [],
        workingMemory: []
      }
    };

    expect(state.currentStage).toBe('intake');
    expect(state.stages.full_review.status).toBe('optional');
  });

  it('describes act timelines and strict chapter context packets', () => {
    const timeline: ActTimeline = {
      acts: [
        {
          id: 'act-1',
          title: 'Opening',
          time: 'Day 1',
          location: 'Archive',
          characters: ['Mira'],
          movement: 'Mira finds the missing ledger.',
          summary: 'Mira enters the archive and finds evidence of a hidden pact.'
        }
      ]
    };

    const packet: ChapterContextPacket = {
      currentChapterTarget: 'Reveal the ledger without resolving the pact.',
      currentActOutline: timeline.acts[0],
      anchors: [{ id: 'a1', text: 'Echo Act 1 Chapter 1: hidden pact', actId: 'act-1', chapterId: 1 }],
      stateMachine: {
        characterStates: [{ name: 'Mira', role: 'Archivist', status: 'Suspicious of the council' }],
        foreshadowing: [{ id: 'f1', text: 'The pact requires a witness.', status: 'open' }]
      },
      previousActSummary: 'The city lost its public memory.',
      currentActSummary: 'Mira investigates the archive.',
      recentChapterTexts: [{ id: 1, title: 'Chapter 1', content: 'Mira opened the sealed drawer.' }],
      matchedHistoryFragments: [{ source: 'act-0', text: 'The council erased witness records.' }]
    };

    expect(packet.currentActOutline.id).toBe('act-1');
    expect(packet.recentChapterTexts).toHaveLength(1);
    expect(packet.matchedHistoryFragments[0].source).toBe('act-0');
  });

  it('enumerates built-in plugin capabilities', () => {
    const capability: StoryPluginCapability = 'write_chapter';

    expect(capability).toBe('write_chapter');
  });
});
