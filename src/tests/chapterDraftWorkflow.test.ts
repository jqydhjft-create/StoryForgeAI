import { describe, expect, it, vi } from 'vitest';
import type { ChapterContextPacket, ChapterReviewReport } from '../shared/types';
import type { StoryPlugin } from '../renderer/services/plugins/storyPluginTypes';
import { createStoryPluginRegistry } from '../renderer/services/plugins/storyPluginRegistry';
import {
  confirmDraftSave,
  forceSaveDraftAfterWarning,
  generateReviewedChapterDraft
} from '../renderer/services/chapterDraftWorkflow';

function packet(): ChapterContextPacket {
  return {
    currentChapterTarget: 'Reveal the ledger.',
    currentActOutline: { id: 'act-1', title: 'Act 1', time: 'Day 1', location: 'Archive', characters: ['Mira'], movement: 'Find ledger', summary: 'Mira finds the ledger.' },
    anchors: [],
    stateMachine: { characterStates: [], foreshadowing: [] },
    previousActSummary: '',
    currentActSummary: 'Mira finds the ledger.',
    recentChapterTexts: [],
    matchedHistoryFragments: []
  };
}

describe('chapterDraftWorkflow', () => {
  it('generates a draft and automatically reviews it', async () => {
    const plugin: StoryPlugin = {
      id: 'test-plugin',
      capabilities: {
        write_chapter: async () => ({
          chapter: {
            meta: { id: 2, title: 'Chapter 2', sceneCount: 1, characters: ['Mira'], locations: ['Archive'], timelineDay: 2 },
            content: '# Chapter 2\n\nMira reads the ledger.'
          }
        }),
        review_chapter: async (): Promise<ChapterReviewReport> => ({
          status: 'issues_found',
          summary: 'One continuity warning.',
          issues: [{ id: 'issue-1', severity: 'warning', message: 'Ledger location needs confirmation.' }]
        })
      }
    };

    const result = await generateReviewedChapterDraft(createStoryPluginRegistry([plugin]), packet());

    expect(result.status).toBe('reviewed');
    expect(result.review.issues[0].message).toContain('Ledger location');
    expect(result.saveDecision).toBe('blocked_by_review');
  });

  it('requires a second confirmation for force-save after warnings', () => {
    const first = forceSaveDraftAfterWarning({ secondConfirmation: false });
    const second = forceSaveDraftAfterWarning({ secondConfirmation: true });

    expect(first).toEqual({ allowed: false, reason: 'second_confirmation_required' });
    expect(second).toEqual({ allowed: true, reason: 'user_overrode_review' });
  });

  it('allows normal save after a passing review', () => {
    expect(confirmDraftSave({ status: 'passed', summary: 'Clean.', issues: [] })).toEqual({ allowed: true, reason: 'review_passed' });
  });

  it('rejects malformed write output before review', async () => {
    const reviewChapter = vi.fn(async (): Promise<ChapterReviewReport> => ({
      status: 'passed',
      summary: 'Clean.',
      issues: []
    }));
    const plugin: StoryPlugin = {
      id: 'test-plugin',
      capabilities: {
        write_chapter: async () => ({}),
        review_chapter: reviewChapter
      }
    };

    await expect(generateReviewedChapterDraft(createStoryPluginRegistry([plugin]), packet())).rejects.toThrow(
      'write_chapter did not return a chapter'
    );
    expect(reviewChapter).not.toHaveBeenCalled();
  });

  it('rejects malformed review output', async () => {
    const plugin: StoryPlugin = {
      id: 'test-plugin',
      capabilities: {
        write_chapter: async () => ({
          chapter: {
            meta: { id: 2, title: 'Chapter 2', sceneCount: 1, characters: ['Mira'], locations: ['Archive'], timelineDay: 2 },
            content: '# Chapter 2\n\nMira reads the ledger.'
          }
        }),
        review_chapter: async () => ({ status: 'passed', summary: 'Missing issues' })
      }
    };

    await expect(generateReviewedChapterDraft(createStoryPluginRegistry([plugin]), packet())).rejects.toThrow(
      'review_chapter did not return a valid review report'
    );
  });
});
