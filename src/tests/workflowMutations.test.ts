import { describe, expect, it } from 'vitest';
import type { ChapterReviewReport, StoryProject } from '../shared/types';
import { createInitialWorkflowState } from '../renderer/services/workflowCore';
import { confirmWorkflowArtifact, recordWorkflowChapterReview, requestWorkflowRegeneration } from '../renderer/services/workflowMutations';

function project(): StoryProject {
  return {
    rootPath: 'D:/Story',
    settings: { name: 'Story', createdAt: '2026-06-09T00:00:00.000Z', reviewStrictness: 'medium' },
    world: { genre: '', premise: '', rules: [], terms: {} },
    characters: [],
    plot: [],
    chapters: [],
    summary: { timeline: [], locations: [], characters: [] },
    workflow: createInitialWorkflowState()
  };
}

describe('workflowMutations', () => {
  it('saves a confirmed intake artifact and unlocks world outline', () => {
    const result = confirmWorkflowArtifact(
      project(),
      'intake',
      {
        genre: 'Mystery',
        worldPremise: 'Memory ledgers.',
        protagonist: 'Mira',
        coreConflict: 'Truth versus safety',
        readerFeeling: 'Uneasy wonder',
        targetLength: '80k',
        requiredElements: []
      },
      '2026-06-09T00:00:00.000Z'
    );

    expect(result.project.workflow.currentStage).toBe('world_outline');
    expect(result.project.workflow.artifacts.initialSettingBook?.genre).toBe('Mystery');
    expect(result.files.map((file) => file.relativePath)).toEqual(['workflow/state.json']);
  });

  it('locks downstream stages when an upstream confirmed artifact is regenerated', () => {
    const first = confirmWorkflowArtifact(
      project(),
      'intake',
      {
        genre: 'Mystery',
        worldPremise: 'Memory ledgers.',
        protagonist: 'Mira',
        coreConflict: 'Truth versus safety',
        readerFeeling: 'Uneasy wonder',
        targetLength: '80k',
        requiredElements: []
      },
      '2026-06-09T00:00:00.000Z'
    );

    const result = requestWorkflowRegeneration(first.project, 'intake', '2026-06-09T01:00:00.000Z');

    expect(result.project.workflow.stages.intake.status).toBe('regenerating');
    expect(result.project.workflow.stages.world_outline.status).toBe('locked');
    expect(result.files[0].relativePath).toBe('workflow/state.json');
  });

  it('advances chapter drafting after all outlined chapters have reviews', () => {
    const review: ChapterReviewReport = { status: 'passed', summary: 'Clean.', issues: [] };
    const intake = confirmWorkflowArtifact(
      project(),
      'intake',
      {
        genre: 'Mystery',
        worldPremise: 'Memory ledgers.',
        protagonist: 'Mira',
        coreConflict: 'Truth versus safety',
        readerFeeling: 'Uneasy wonder',
        targetLength: '80k',
        requiredElements: []
      },
      '2026-06-09T00:00:00.000Z'
    ).project;
    const world = confirmWorkflowArtifact(intake, 'world_outline', { worldDocument: 'World', masterOutline: 'Outline' }).project;
    const timeline = confirmWorkflowArtifact(world, 'act_timeline', {
      acts: [{ id: 'act-1', title: 'Act 1', time: 'Day 1', location: 'Archive', characters: ['Mira'], movement: 'Find ledger', summary: 'Opening.' }]
    }).project;
    const outline = confirmWorkflowArtifact(timeline, 'scene_outline', {
      acts: [{ actId: 'act-1', summary: 'Opening.', chapters: [{ id: 'c1', actId: 'act-1', chapterId: 1, target: 'Open.', scenes: [], anchors: [] }] }]
    }).project;

    const result = recordWorkflowChapterReview(outline, 1, review, '2026-06-09T02:00:00.000Z');

    expect(result.project.workflow.stages.chapter_draft.status).toBe('confirmed');
    expect(result.project.workflow.currentStage).toBe('act_scoring');
    expect(result.project.workflow.stages.act_scoring.status).toBe('draft');
    expect(result.project.workflow.artifacts.chapterReviews?.[1].summary).toBe('Clean.');
  });
});
