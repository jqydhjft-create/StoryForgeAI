import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { reconcileWorkflowProject, reconcileWorkflowProjectForRequest, startModelRunTicker } from '../renderer/App';
import { confirmWorkflowArtifact } from '../renderer/services/workflowMutations';
import { createInitialWorkflowState } from '../shared/workflowDefaults';
import type { StoryProject } from '../shared/types';

function appSource(): string {
  return readFileSync('src/renderer/App.tsx', 'utf8');
}

function project(): StoryProject {
  return {
    rootPath: 'D:/projects/test',
    settings: { name: 'Test', createdAt: '2026-07-28T00:00:00.000Z', reviewStrictness: 'medium' },
    world: { genre: 'Mystery', premise: 'A secret', rules: [], terms: {} },
    characters: [],
    plot: [],
    chapters: [{ meta: { id: 1, title: 'Chapter 1', sceneCount: 1, characters: [], locations: [], timelineDay: 1 }, content: 'Before' }],
    summary: { timeline: [], locations: [], characters: [] },
    workflow: createInitialWorkflowState()
  };
}

describe('workspace workflow wiring', () => {
  it('renders the workspace shell after intake is complete', () => {
    const source = appSource();

    expect(source).toContain("import { WorkspaceShell } from './components/WorkspaceShell'");
    expect(source).toMatch(/if \(intakeScreen === 'confirm'\)[\s\S]*?return \([\s\S]*?\);[\s\S]*?return \([\s\S]*?<WorkspaceShell/);
  });

  it('keeps unified workflow callbacks connected to workflowService', () => {
    const source = appSource();

    expect(source).toContain('workflowService.generateStage(project, stage, workflowIdea)');
    expect(source).toContain('workflowService.confirmStage(project, stage, artifact)');
    expect(source).toContain('workflowService.regenerateStage(project, stage)');
    expect(source).toContain('workflowService.generateChapter(project, target.actId, target.chapterId)');
    expect(source).toContain('getWorkflowService()');
    expect(source).toContain('onGenerateStage={(stage) => void generateWorkflowStage(stage)}');
    expect(source).toContain('onConfirmStage={(stage) => void confirmCurrentWorkflowStage(stage)}');
    expect(source).toContain('onRegenerateStage={(stage) => void regenerateWorkflowStage(stage)}');
  });

  it('switches the editor directly to summary or export from the asset rail', () => {
    const source = appSource();

    expect(source).toMatch(/function handleAssetTypeChange\(assetType: AssetType\)[\s\S]*?assetType === 'summary'[\s\S]*?setSelection\(\{ kind: 'summary', id: 'summary' \}\)[\s\S]*?assetType === 'export'[\s\S]*?setSelection\(\{ kind: 'export', id: 'export' \}\)/);
    expect(source).toContain('onAssetTypeChange={handleAssetTypeChange}');
  });

  it('reconciles a workflow mutation onto the latest project without losing a later editor save', () => {
    const requestProject = project();
    const mutation = confirmWorkflowArtifact(requestProject, 'intake', {
      genre: 'Mystery', worldPremise: 'A secret', protagonist: 'Mira', coreConflict: 'Truth', readerFeeling: 'Dread', targetLength: '10k', requiredElements: []
    });
    const latestProject = {
      ...requestProject,
      chapters: [{ ...requestProject.chapters[0], content: 'Saved after generation started' }]
    };

    const reconciled = reconcileWorkflowProject(latestProject, requestProject, mutation.project, 'intake');

    expect(reconciled.chapters[0].content).toBe('Saved after generation started');
    expect(reconciled.workflow).toEqual(mutation.project.workflow);
  });

  it('ticks the active model-run clock and cleans up after completion', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(0));
    const ticks: number[] = [];
    const stop = startModelRunTicker((now) => ticks.push(now));

    expect(ticks).toEqual([0]);
    vi.advanceTimersByTime(1_000);
    expect(ticks).toEqual([0, 1_000]);
    stop();
    vi.advanceTimersByTime(1_000);
    expect(ticks).toEqual([0, 1_000]);
    vi.useRealTimers();
  });

  it('reconciles again after persistence so edits made during a write survive', () => {
    const requestProject = project();
    const mutation = confirmWorkflowArtifact(requestProject, 'intake', {
      genre: 'Mystery', worldPremise: 'A secret', protagonist: 'Mira', coreConflict: 'Truth', readerFeeling: 'Dread', targetLength: '10k', requiredElements: []
    });
    const editedDuringWrite = { ...requestProject, chapters: [{ ...requestProject.chapters[0], content: 'Saved during write' }] };

    expect(reconcileWorkflowProject(editedDuringWrite, requestProject, mutation.project, 'intake').chapters[0].content)
      .toBe('Saved during write');
  });

  it('drops a delayed workflow response after another project has become active', () => {
    const requestProject = project();
    const otherProject = { ...project(), rootPath: 'browser:other-project' };
    const mutation = confirmWorkflowArtifact(requestProject, 'intake', {
      genre: 'Mystery', worldPremise: 'A secret', protagonist: 'Mira', coreConflict: 'Truth', readerFeeling: 'Dread', targetLength: '10k', requiredElements: []
    });

    expect(reconcileWorkflowProjectForRequest(otherProject, requestProject, mutation.project, 'intake')).toBeNull();
  });
});
