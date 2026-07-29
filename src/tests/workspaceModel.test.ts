import { describe, expect, it } from 'vitest';
import { createInitialWorkflowState } from '../shared/workflowDefaults';
import type { StoryProject, StoryWorkflowState } from '../shared/types';
import {
  assetTypeForTreeSelection,
  resolveAssetListCollapsed,
  resolveContextList,
  resolveContextRailView,
  resolveModelRunView
} from '../renderer/components/workspaceModel';

function projectFixture(): StoryProject {
  return {
    rootPath: 'D:/Writer/fixture',
    settings: { name: 'Fixture', createdAt: '2026-07-28T00:00:00.000Z', reviewStrictness: 'medium' },
    world: { genre: 'Fantasy', premise: 'A rainy kingdom', rules: [], terms: {} },
    characters: [
      { id: 'mira', name: 'Mira Rain', role: 'Lead', motivation: 'Find truth', flaw: 'Guarded', arc: 'Opens up' },
      { id: 'orin', name: 'Orin', role: 'Guide', motivation: 'Protect Mira', flaw: 'Secretive', arc: 'Confesses' }
    ],
    plot: [],
    chapters: [
      { meta: { id: 10, title: 'After the Rain', sceneCount: 1, characters: [], locations: [], timelineDay: 10 }, content: '' },
      { meta: { id: 2, title: 'Rainfall', sceneCount: 1, characters: [], locations: [], timelineDay: 2 }, content: '' },
      { meta: { id: 1, title: 'Arrival', sceneCount: 1, characters: [], locations: [], timelineDay: 1 }, content: '' }
    ],
    summary: { timeline: [], locations: [], characters: [] },
    workflow: createInitialWorkflowState()
  };
}

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

describe('workspaceModel', () => {
  it('maps tree selections to workspace asset types', () => {
    expect(assetTypeForTreeSelection({ kind: 'chapter', id: '2' })).toBe('chapters');
    expect(assetTypeForTreeSelection({ kind: 'character', id: 'mira' })).toBe('characters');
    expect(assetTypeForTreeSelection({ kind: 'plot', id: 'beats' })).toBe('acts');
    expect(assetTypeForTreeSelection({ kind: 'scene_outline', id: 'chapter-1' })).toBe('scene_outline');
  });

  it('filters chapter context case-insensitively in numeric chapter order', () => {
    const items = resolveContextList({ kind: 'chapters', project: projectFixture(), query: 'rain' });

    expect(items.map((item) => item.id)).toEqual(['2', '10']);
    expect(items.map((item) => item.label)).toEqual(['Chapter 2: Rainfall', 'Chapter 10: After the Rain']);
  });

  it('returns plain character context items without React dependencies', () => {
    expect(resolveContextList({ kind: 'characters', project: projectFixture(), query: 'mira' })).toEqual([
      {
        id: 'mira',
        label: 'Mira Rain',
        detail: 'Lead',
        kind: 'characters',
        value: projectFixture().characters[0]
      }
    ]);
  });

  it('prefers unified world and act artifacts when legacy projections are empty', () => {
    const project = projectFixture();
    project.world = { genre: '', premise: '', rules: [], terms: {} };
    project.plot = [];
    project.workflow.artifacts.worldOutline = {
      worldDocument: 'A rain-soaked archive city where memories can be borrowed.',
      masterOutline: 'A detective follows a missing memory through the city.'
    };
    project.workflow.artifacts.actTimeline = {
      acts: [{
        id: 'act-1',
        title: 'The borrowed memory',
        time: 'Day 1',
        location: 'Archive',
        characters: ['Mira'],
        movement: 'Investigation begins',
        summary: 'Mira finds the first clue.'
      }]
    };

    expect(resolveContextList({ kind: 'world', project, query: 'archive' })).toMatchObject([{
      kind: 'world',
      id: 'bible',
      label: 'A rain-soaked archive city where memories can be borrowed.'
    }]);
    expect(resolveContextList({ kind: 'acts', project, query: 'borrowed' })).toMatchObject([{
      kind: 'acts',
      id: 'act-1',
      label: 'The borrowed memory',
      detail: 'Mira finds the first clue.'
    }]);
  });

  it('lists scene-outline assets globally by chapter ID', () => {
    const project = projectFixture();
    project.workflow.artifacts.sceneOutline = {
      acts: [
        {
          actId: 'act-2',
          summary: 'Later act',
          chapters: [{ id: 'chapter-3', actId: 'act-2', chapterId: 3, target: 'Third turn', scenes: [], anchors: [] }]
        },
        {
          actId: 'act-1',
          summary: 'Opening act',
          chapters: [{ id: 'chapter-1', actId: 'act-1', chapterId: 1, target: 'Opening turn', scenes: [], anchors: [] }]
        }
      ]
    };

    expect(resolveContextList({ kind: 'scene_outline', project, query: '' })).toMatchObject([
      { kind: 'scene_outline', id: 'chapter-1', label: 'Chapter 1 outline' },
      { kind: 'scene_outline', id: 'chapter-3', label: 'Chapter 3 outline' }
    ]);
  });

  it('makes historical stages read-only and future stages uninspectable', () => {
    const workflow = workflowAtWorldOutline();
    const base = {
      workflow,
      drafts: {},
      pendingChapterDraft: null,
      isBusy: false,
      statusText: '',
      errorText: '',
      startedAt: null,
      now: 0
    };

    expect(resolveContextRailView({ ...base, viewedStage: 'intake' })).toMatchObject({
      mode: 'history',
      stage: 'intake',
      canMutate: false,
      artifact: workflow.artifacts.initialSettingBook,
      runStatus: 'success'
    });
    expect(resolveContextRailView({ ...base, viewedStage: 'character_bible' })).toBeNull();
  });

  it('keeps the current stage action-capable through the workflow panel model', () => {
    const workflow = workflowAtWorldOutline();

    expect(resolveContextRailView({
      workflow,
      drafts: {},
      pendingChapterDraft: null,
      viewedStage: 'world_outline',
      isBusy: false,
      statusText: '',
      errorText: '',
      startedAt: null,
      now: 0
    })).toMatchObject({ mode: 'current', canMutate: true, runStatus: 'idle' });
  });

  it('uses zero elapsed seconds when the context rail omits a start time', () => {
    expect(resolveContextRailView({
      workflow: workflowAtWorldOutline(),
      drafts: {},
      pendingChapterDraft: null,
      viewedStage: 'world_outline',
      isBusy: false,
      statusText: '',
      errorText: '',
      now: 0
    })).toMatchObject({ elapsedSeconds: 0 });
  });

  it('keeps a busy current stage non-mutable while reporting a running model', () => {
    expect(resolveContextRailView({
      workflow: workflowAtWorldOutline(),
      drafts: {},
      pendingChapterDraft: null,
      viewedStage: 'world_outline',
      isBusy: true,
      statusText: 'Generating',
      errorText: '',
      startedAt: 0,
      now: 1_000
    })).toMatchObject({ runStatus: 'running', canMutate: false });
  });

  it('reports a busy model run with elapsed seconds', () => {
    expect(resolveModelRunView({
      isBusy: true,
      statusText: 'Generating',
      errorText: '',
      startedAt: 1000,
      now: 46000
    })).toEqual({ status: 'running', elapsedSeconds: 45, canRetry: false, message: 'Generating' });
  });

  it('uses the new start time for a new running operation instead of a previous final elapsed value', () => {
    expect(resolveModelRunView({
      isBusy: true,
      statusText: 'Generating',
      errorText: '',
      startedAt: 10_000,
      now: 12_000,
      outcome: null,
      completedElapsedSeconds: 45
    })).toMatchObject({ status: 'running', elapsedSeconds: 2 });
  });

  it('reports errors without automatic retry and surfaces pending artifacts as success', () => {
    expect(resolveModelRunView({
      isBusy: false,
      statusText: '',
      errorText: 'Network unavailable',
      startedAt: null,
      now: 0
    })).toEqual({ status: 'error', elapsedSeconds: 0, canRetry: true, message: 'Network unavailable' });
    expect(resolveModelRunView({
      isBusy: false,
      statusText: '',
      errorText: '',
      startedAt: null,
      now: 0,
      hasArtifact: true
    })).toEqual({ status: 'success', elapsedSeconds: 0, canRetry: false, message: '' });
  });

  it('uses zero elapsed seconds when a model run has no start time', () => {
    expect(resolveModelRunView({
      isBusy: false,
      statusText: '',
      errorText: '',
      now: 0
    })).toEqual({ status: 'idle', elapsedSeconds: 0, canRetry: false, message: '' });
  });

  it('prioritizes running over errors and artifacts, and errors over artifacts', () => {
    expect(resolveModelRunView({
      isBusy: true,
      statusText: 'Generating',
      errorText: 'Network unavailable',
      startedAt: 0,
      now: 1_000,
      hasArtifact: true
    })).toMatchObject({ status: 'running', canRetry: false });
    expect(resolveModelRunView({
      isBusy: false,
      statusText: '',
      errorText: 'Network unavailable',
      startedAt: 0,
      now: 1_000,
      hasArtifact: true
    })).toMatchObject({ status: 'error', canRetry: true });
  });

  it('clamps future model start times to zero elapsed seconds', () => {
    expect(resolveModelRunView({
      isBusy: true,
      statusText: 'Generating',
      errorText: '',
      startedAt: 2_000,
      now: 1_000
    })).toMatchObject({ status: 'running', elapsedSeconds: 0 });
  });

  it('defaults the asset list closed only in the compact desktop range unless the user chose a value', () => {
    expect(resolveAssetListCollapsed(1023, null)).toBe(false);
    expect(resolveAssetListCollapsed(1024, null)).toBe(true);
    expect(resolveAssetListCollapsed(1279, null)).toBe(true);
    expect(resolveAssetListCollapsed(1280, null)).toBe(false);
    expect(resolveAssetListCollapsed(1100, false)).toBe(false);
    expect(resolveAssetListCollapsed(1400, true)).toBe(true);
  });
});
