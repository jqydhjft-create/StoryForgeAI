import { createElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { WorkspaceHeader } from '../renderer/components/WorkspaceHeader';
import { createInitialWorkflowState } from '../shared/workflowDefaults';
import type { StoryWorkflowState, WorkflowStageId } from '../shared/types';

function workflowAtCharacterBible(): StoryWorkflowState {
  const workflow = createInitialWorkflowState();
  return {
    ...workflow,
    currentStage: 'character_bible',
    stages: {
      ...workflow.stages,
      intake: { status: 'confirmed' },
      world_outline: { status: 'confirmed' },
      character_bible: { status: 'draft' }
    }
  };
}

function findElement(
  node: ReactNode,
  predicate: (element: ReactElement) => boolean
): ReactElement | null {
  if (node === null || node === undefined || typeof node === 'boolean') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findElement(child, predicate);
      if (match) return match;
    }
    return null;
  }
  if (typeof node !== 'object' || !('props' in node)) return null;

  const element = node as ReactElement<{ children?: ReactNode }>;
  if (predicate(element)) return element;
  return findElement(element.props.children, predicate);
}

describe('WorkspaceHeader', () => {
  it('shows W2 current-stage context and all eight progress nodes', () => {
    const workflow = workflowAtCharacterBible();
    const html = renderToStaticMarkup(createElement(WorkspaceHeader, {
      language: 'en',
      projectName: 'Glass Archive',
      workflow,
      viewedStage: 'character_bible',
      onViewStage: vi.fn(),
      onOpenDiagnostics: vi.fn()
    }));

    expect(html).toContain('Glass Archive');
    expect(html).toContain('Current stage');
    expect(html).toContain('Character Bible');
    expect(html).toContain('3 / 8');
    expect(html).toContain('View all');
    expect(html).toContain('Settings');
    expect(html.match(/data-workflow-stage=/g)).toHaveLength(8);
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
  });

  it('enables confirmed stages and disables locked future stages', () => {
    const html = renderToStaticMarkup(createElement(WorkspaceHeader, {
      language: 'en',
      projectName: 'Glass Archive',
      workflow: workflowAtCharacterBible(),
      viewedStage: 'character_bible',
      onViewStage: vi.fn(),
      onOpenDiagnostics: vi.fn()
    }));

    expect(html).toMatch(/<button[^>]*data-workflow-stage="intake"(?![^>]*disabled)[^>]*>/);
    expect(html).toMatch(/<button[^>]*data-workflow-stage="scene_outline"[^>]*disabled[^>]*>/);
  });

  it('delegates stage viewing and diagnostics through callbacks', () => {
    const onViewStage = vi.fn();
    const onOpenDiagnostics = vi.fn();
    const tree = WorkspaceHeader({
      language: 'en',
      projectName: 'Glass Archive',
      workflow: workflowAtCharacterBible(),
      viewedStage: 'character_bible',
      onViewStage,
      onOpenDiagnostics
    });
    const intakeButton = findElement(
      tree,
      (element) => element.props['data-workflow-stage'] === 'intake'
    );
    const diagnosticsButton = findElement(
      tree,
      (element) => element.props['data-action'] === 'open-diagnostics'
    );

    expect(intakeButton).not.toBeNull();
    expect(diagnosticsButton).not.toBeNull();
    (intakeButton?.props.onClick as (() => void) | undefined)?.();
    (diagnosticsButton?.props.onClick as (() => void) | undefined)?.();

    expect(onViewStage).toHaveBeenCalledWith('intake' satisfies WorkflowStageId);
    expect(onOpenDiagnostics).toHaveBeenCalledOnce();
  });
});
