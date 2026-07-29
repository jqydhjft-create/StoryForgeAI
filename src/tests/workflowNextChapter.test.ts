import { describe, expect, it } from 'vitest';
import type { StoryProject } from '../shared/types';
import { createInitialWorkflowState } from '../shared/workflowDefaults';
import {
  isReplaceableWorkflowPlaceholder,
  resolveNextWorkflowChapter
} from '../renderer/services/workflowNextChapter';

function project(): StoryProject {
  const workflow = createInitialWorkflowState();
  workflow.artifacts.sceneOutline = {
    acts: [
      {
        actId: 'act-1',
        summary: 'Opening',
        chapters: [
          { id: 'chapter-1', actId: 'act-1', chapterId: 1, target: 'Open', scenes: [], anchors: [] }
        ]
      }
    ]
  };

  return {
    rootPath: 'D:/Story',
    settings: { name: 'Story', createdAt: '2026-07-28T00:00:00.000Z', reviewStrictness: 'medium' },
    world: { genre: '', premise: '', rules: [], terms: {} },
    characters: [],
    plot: [],
    chapters: [
      {
        meta: { id: 1, title: 'Chapter 1', sceneCount: 1, characters: [], locations: [], timelineDay: 1 },
        content: '# Chapter 1\n\n'
      }
    ],
    summary: { timeline: [], locations: [], characters: [] },
    workflow
  };
}

describe('workflowNextChapter', () => {
  it('selects outlined Chapter 1 when a new project contains the default blank placeholder', () => {
    expect(resolveNextWorkflowChapter(project())).toEqual({
      status: 'ready',
      actId: 'act-1',
      chapterId: 1,
      existingChapter: 'placeholder'
    });
  });

  it('skips reviewed chapters and crosses act boundaries in persisted outline order', () => {
    const source = project();
    source.workflow.artifacts.chapterReviews = {
      1: { status: 'passed', summary: 'Clean', issues: [] }
    };
    source.workflow.artifacts.sceneOutline?.acts.push({
      actId: 'act-2',
      summary: 'Closing',
      chapters: [
        { id: 'chapter-7', actId: 'act-2', chapterId: 7, target: 'Close', scenes: [], anchors: [] }
      ]
    });

    expect(resolveNextWorkflowChapter(source)).toEqual({
      status: 'ready',
      actId: 'act-2',
      chapterId: 7,
      existingChapter: 'none'
    });
  });

  it('selects the globally earliest unreviewed outlined chapter regardless of model outline order', () => {
    const source = project();
    source.chapters = [];
    source.workflow.artifacts.sceneOutline!.acts[0].chapters = [
      { id: 'chapter-9', actId: 'act-1', chapterId: 9, target: 'First', scenes: [], anchors: [] },
      { id: 'chapter-3', actId: 'act-1', chapterId: 3, target: 'Second', scenes: [], anchors: [] }
    ];
    source.workflow.artifacts.sceneOutline!.acts.push({
      actId: 'act-2',
      summary: 'Earlier chapter',
      chapters: [
        { id: 'chapter-1', actId: 'act-2', chapterId: 1, target: 'Opening', scenes: [], anchors: [] }
      ]
    });

    expect(resolveNextWorkflowChapter(source)).toMatchObject({
      status: 'ready',
      actId: 'act-2',
      chapterId: 1
    });
  });

  it('distinguishes a missing outline from a completed outline', () => {
    const missing = project();
    delete missing.workflow.artifacts.sceneOutline;
    expect(resolveNextWorkflowChapter(missing)).toEqual({ status: 'unavailable', reason: 'missing_outline' });

    const complete = project();
    complete.workflow.artifacts.chapterReviews = {
      1: { status: 'passed', summary: 'Clean', issues: [] }
    };
    expect(resolveNextWorkflowChapter(complete)).toEqual({ status: 'unavailable', reason: 'complete' });
  });

  it('refuses to overwrite user-authored content at the next outlined chapter ID', () => {
    const source = project();
    source.chapters[0].content = '# Chapter 1\n\nA real opening paragraph.';

    expect(resolveNextWorkflowChapter(source)).toEqual({
      status: 'conflict',
      actId: 'act-1',
      chapterId: 1
    });
  });

  it('recognizes only empty or exact default headings as replaceable placeholders', () => {
    expect(isReplaceableWorkflowPlaceholder('', 1)).toBe(true);
    expect(isReplaceableWorkflowPlaceholder('\uFEFF  \n', 1)).toBe(true);
    expect(isReplaceableWorkflowPlaceholder('# Chapter 1\n\n', 1)).toBe(true);
    expect(isReplaceableWorkflowPlaceholder('# \u7b2c1\u7ae0\n\n', 1)).toBe(true);
    expect(isReplaceableWorkflowPlaceholder('# Chapter 2\n\n', 1)).toBe(false);
    expect(isReplaceableWorkflowPlaceholder('# Chapter 1\n\nProse', 1)).toBe(false);
  });
});
