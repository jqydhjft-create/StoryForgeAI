import { describe, expect, it } from 'vitest';
import type { StoryProject } from '../shared/types';
import { runLightReview } from '../renderer/services/liveReviewService';

const project: StoryProject = {
  rootPath: '',
  settings: { name: 'Review Demo', createdAt: '2026-06-08T00:00:00.000Z', reviewStrictness: 'medium' },
  world: { genre: '', premise: '', rules: [], terms: {} },
  characters: [],
  plot: [],
  chapters: [
    {
      meta: { id: 1, title: 'Library', sceneCount: 1, characters: [], locations: [], timelineDay: 1 },
      content: '# Library\n\nThey enter the library and find the hidden book.'
    },
    {
      meta: { id: 3, title: 'Library', sceneCount: 1, characters: [], locations: [], timelineDay: 3 },
      content: '# Library\n\nThey enter the library and find the hidden book again.'
    }
  ],
  summary: { timeline: [], locations: [], characters: [] }
};

describe('liveReviewService', () => {
  it('reports lightweight continuity warnings without mutating the project', async () => {
    const warnings = await runLightReview(project);

    expect(warnings.map((warning) => warning.code)).toContain('missing-chapter');
    expect(warnings.map((warning) => warning.code)).toContain('duplicate-title');
    expect(warnings.map((warning) => warning.code)).toContain('repeated-opening');
  });
});
