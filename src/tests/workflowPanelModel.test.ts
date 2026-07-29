import { describe, expect, it, vi } from 'vitest';
import { createInitialWorkflowState } from '../shared/workflowDefaults';
import type { StoryWorkflowState } from '../shared/types';
import {
  artifactForWorkflowStage,
  canInspectWorkflowStage,
  dispatchWorkflowPanelAction,
  resolveWorkflowPanelView
} from '../renderer/components/workflowPanelModel';

function workflowAtWorldOutline(): StoryWorkflowState {
  const workflow = createInitialWorkflowState();
  return {
    ...workflow,
    currentStage: 'world_outline',
    stages: {
      ...workflow.stages,
      intake: { status: 'confirmed', confirmedAt: '2026-07-28T00:00:00.000Z' },
      world_outline: { status: 'draft' }
    },
    artifacts: {
      initialSettingBook: {
        genre: 'Mystery',
        worldPremise: 'Memories are traded.',
        protagonist: 'Mira',
        coreConflict: 'Truth versus safety',
        readerFeeling: 'Uneasy wonder',
        targetLength: '80k',
        requiredElements: []
      }
    }
  };
}

describe('workflowPanelModel', () => {
  it('allows current and confirmed stages to be inspected but keeps future stages disabled', () => {
    const workflow = workflowAtWorldOutline();

    expect(canInspectWorkflowStage(workflow, 'intake')).toBe(true);
    expect(canInspectWorkflowStage(workflow, 'world_outline')).toBe(true);
    expect(canInspectWorkflowStage(workflow, 'character_bible')).toBe(false);
  });

  it('prefers a current draft and uses confirmed artifacts for history', () => {
    const workflow = workflowAtWorldOutline();
    const draft = { worldDocument: 'Draft world', masterOutline: 'Draft outline' };

    expect(artifactForWorkflowStage(workflow, { world_outline: draft }, null, 'world_outline')).toEqual(draft);
    expect(artifactForWorkflowStage(workflow, {}, null, 'intake')).toEqual(workflow.artifacts.initialSettingBook);
  });

  it('shows generate before a draft and confirm plus regenerate after a draft', () => {
    const workflow = workflowAtWorldOutline();

    expect(resolveWorkflowPanelView({
      workflow,
      drafts: {},
      pendingChapterDraft: null,
      viewedStage: 'world_outline',
      isBusy: false
    })).toMatchObject({
      mode: 'current',
      primaryAction: 'generate',
      canRegenerate: false
    });
    expect(resolveWorkflowPanelView({
      workflow,
      drafts: { world_outline: { worldDocument: 'World', masterOutline: 'Outline' } },
      pendingChapterDraft: null,
      viewedStage: 'world_outline',
      isBusy: false
    })).toMatchObject({
      mode: 'current',
      primaryAction: 'confirm',
      canRegenerate: true
    });
  });

  it('makes a completed stage read-only even when another stage is current', () => {
    const workflow = workflowAtWorldOutline();

    expect(resolveWorkflowPanelView({
      workflow,
      drafts: {},
      pendingChapterDraft: null,
      viewedStage: 'intake',
      isBusy: false
    })).toMatchObject({
      mode: 'history',
      primaryAction: null,
      canRegenerate: false
    });
  });

  it('shows only force save when a pending chapter is blocked by review', () => {
    const workflow = workflowAtWorldOutline();
    workflow.currentStage = 'chapter_draft';
    workflow.stages.chapter_draft = { status: 'draft' };
    const pendingChapterDraft = {
      contextPacket: {} as never,
      chapter: {
        meta: {
          id: 1,
          title: 'Chapter 1',
          sceneCount: 1,
          characters: ['Mira'],
          locations: ['Archive'],
          timelineDay: 1
        },
        content: 'Draft text'
      },
      review: {
        status: 'issues_found' as const,
        summary: 'Continuity issue',
        issues: [{ id: 'issue-1', severity: 'error' as const, message: 'Contradiction' }]
      },
      saveDecision: 'blocked_by_review' as const
    };

    expect(resolveWorkflowPanelView({
      workflow,
      drafts: {},
      pendingChapterDraft,
      viewedStage: 'chapter_draft',
      isBusy: false
    })).toMatchObject({
      primaryAction: null,
      reviewBlocked: true,
      canForceSave: true
    });
  });

  it('dispatches each action to the existing callback contract', () => {
    const callbacks = {
      onGenerateStage: vi.fn(),
      onConfirmStage: vi.fn(),
      onRegenerateStage: vi.fn(),
      onForceSaveChapter: vi.fn()
    };

    dispatchWorkflowPanelAction('generate', 'world_outline', callbacks);
    dispatchWorkflowPanelAction('confirm', 'world_outline', callbacks);
    dispatchWorkflowPanelAction('regenerate', 'world_outline', callbacks);
    dispatchWorkflowPanelAction('force_save', 'chapter_draft', callbacks);

    expect(callbacks.onGenerateStage).toHaveBeenCalledWith('world_outline');
    expect(callbacks.onConfirmStage).toHaveBeenCalledWith('world_outline');
    expect(callbacks.onRegenerateStage).toHaveBeenCalledWith('world_outline');
    expect(callbacks.onForceSaveChapter).toHaveBeenCalledOnce();
  });
});
