import { createElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ContextRail, type ContextRailProps } from '../renderer/components/ContextRail';
import { ModelRunCard } from '../renderer/components/ModelRunCard';
import { createInitialWorkflowState } from '../shared/workflowDefaults';
import type { StoryWorkflowState } from '../shared/types';

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

function baseProps(overrides: Partial<ContextRailProps> = {}): ContextRailProps {
  return {
    language: 'en',
    workflow: workflowAtWorldOutline(),
    drafts: {},
    pendingChapterDraft: null,
    viewedStage: 'world_outline',
    expanded: true,
    isBusy: false,
    statusText: '',
    errorText: '',
    startedAt: null,
    runStage: null,
    runLabel: null,
    runOutcome: null,
    completedElapsedSeconds: null,
    now: 0,
    onGenerateStage: vi.fn(),
    onConfirmStage: vi.fn(),
    onRegenerateStage: vi.fn(),
    onForceSaveChapter: vi.fn(),
    onReturnCurrent: vi.fn(),
    onRetry: vi.fn(),
    onToggle: vi.fn(),
    ...overrides
  };
}

function renderRail(overrides: Partial<ContextRailProps> = {}): string {
  return renderToStaticMarkup(createElement(ContextRail, baseProps(overrides)));
}

function visit(node: ReactNode, predicate: (element: ReactElement) => boolean): ReactElement | null {
  if (!isValidElement(node)) return null;
  if (predicate(node)) return node;
  const children = (node.props as { children?: ReactNode }).children;
  if (Array.isArray(children)) {
    for (const child of children) {
      const match = visit(child, predicate);
      if (match) return match;
    }
    return null;
  }
  return visit(children, predicate);
}

describe('ContextRail', () => {
  it('renders historical artifact content with only a return-current action', () => {
    const html = renderRail({ viewedStage: 'intake' });

    expect(html).toContain('Memories are traded.');
    expect(html).toContain('Return to current stage');
    expect(html).not.toContain('Generate');
    expect(html).not.toContain('Regenerate');
    expect(html).not.toContain('Confirm and continue');
    expect(html).not.toContain('Force save');
  });

  it('renders only current-stage actions allowed by the workflow panel model', () => {
    const draft = { worldDocument: 'World document', masterOutline: 'Master outline' };
    const html = renderRail({ drafts: { world_outline: draft } });

    expect(html).toContain('Confirm and continue');
    expect(html).toContain('Regenerate');
    expect(html).not.toContain('Generate World + Outline');
    expect(html).not.toContain('Force save');
  });

  it('shows running stage and elapsed time without blocking the workspace', () => {
    const html = renderRail({
      isBusy: true,
      statusText: 'Generating outline',
      startedAt: 1_000,
      now: 46_000
    });

    expect(html).toContain('role="status"');
    expect(html).toContain('World + Outline');
    expect(html).toContain('45s');
    expect(html).toContain('Working in the background');
    expect(html).not.toContain('workflow-stage-actions');
    expect(html).not.toContain('role="dialog"');
  });

  it('keeps the active run label when the reader inspects workflow history', () => {
    const html = renderRail({
      viewedStage: 'intake',
      isBusy: true,
      runStage: 'world_outline',
      statusText: 'Generating outline',
      startedAt: 0,
      now: 1_000
    });

    expect(html).toContain('World + Outline');
    expect(html).not.toContain('Initial Brief</strong>');
  });

  it('labels a provider-backed summary operation without claiming a workflow stage', () => {
    const html = renderRail({
      isBusy: true,
      runStage: null,
      runLabel: 'Summary',
      statusText: 'Refreshing summary',
      startedAt: 0,
      now: 1_000
    });

    expect(html).toContain('<strong>Summary</strong>');
    expect(html).toContain('Refreshing summary');
  });

  it('retains summary success and its final elapsed time without a workflow artifact', () => {
    const html = renderRail({
      runStage: null,
      runLabel: 'Summary',
      runOutcome: 'success',
      completedElapsedSeconds: 12,
      statusText: 'Summary ready'
    });

    expect(html).toContain('data-run-status="success"');
    expect(html).toContain('Summary ready');
    expect(html).toContain('12s');
  });

  it('shows successful completion without claiming that project data was persisted', () => {
    const html = renderRail({
      drafts: { world_outline: { worldDocument: 'World document', masterOutline: 'Master outline' } },
      statusText: 'Outline ready'
    });

    expect(html).toContain('data-run-status="success"');
    expect(html).toContain('Outline ready');
    expect(html.toLowerCase()).not.toMatch(/project (was )?(saved|written)/);
  });

  it('shows an alert and an explicit retry callback without persistence claims', () => {
    const onRetry = vi.fn();
    const props = baseProps({ errorText: 'Provider timed out', onRetry });
    const html = renderToStaticMarkup(createElement(ContextRail, props));
    const tree = ContextRail(props);
    const card = visit(tree, (element) => element.type === ModelRunCard);
    const cardTree = card ? ModelRunCard(card.props as Parameters<typeof ModelRunCard>[0]) : null;
    const retry = visit(cardTree, (element) => element.type === 'button' && element.props['data-action'] === 'retry');

    expect(html).toContain('role="alert"');
    expect(html).toContain('Provider timed out');
    expect(html).toContain('Retry');
    expect(html.toLowerCase()).not.toMatch(/project (was )?(saved|written)/);
    expect(retry).not.toBeNull();
    (retry?.props as { onClick: () => void }).onClick();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('shows only force-save when chapter review blocks normal saving', () => {
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
    const html = renderRail({ workflow, viewedStage: 'chapter_draft', pendingChapterDraft });

    expect(html).toContain('Continuity issue');
    expect(html).toContain('Force save');
    expect(html).not.toContain('Save chapter and continue');
    expect(html).not.toContain('Regenerate');
  });

  it('keeps running status, elapsed time, and an accessible toggle when collapsed', () => {
    const html = renderRail({
      expanded: false,
      isBusy: true,
      statusText: 'Generating outline',
      startedAt: 0,
      now: 12_000
    });

    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="Expand context rail"');
    expect(html).toContain('data-run-status="running"');
    expect(html).toContain('Running');
    expect(html).toContain('12s');
    expect(html).not.toContain('workflow-context-rail-body');
  });
});

describe('ModelRunCard', () => {
  it('keeps the ticking elapsed value outside the live announcement', () => {
    const html = renderToStaticMarkup(createElement(ModelRunCard, {
      status: 'running',
      stageLabel: 'World + Outline',
      elapsedSeconds: 7,
      message: 'Generating outline',
      errorText: '',
      canRetry: false,
      onRetry: vi.fn(),
      onToggle: vi.fn()
    }));

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="off"');
    expect(html).toContain('7s');
  });

  it('renders central Chinese model-run status and background copy', () => {
    const html = renderToStaticMarkup(createElement(ModelRunCard, {
      language: 'zh-CN',
      status: 'running',
      stageLabel: '世界与大纲',
      elapsedSeconds: 12,
      message: '',
      errorText: '',
      canRetry: false,
      onRetry: vi.fn(),
      onToggle: vi.fn()
    }));

    expect(html).toContain('运行中');
    expect(html).toContain('已用时间 12s');
    expect(html).toContain('正在后台运行');
  });
});
