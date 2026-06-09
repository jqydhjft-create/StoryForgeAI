import { describe, expect, it } from 'vitest';
import type { StoryProject } from '../shared/types';
import { createInitialWorkflowState } from '../shared/workflowDefaults';
import { countProjectCharacters, countTextCharacters } from '../renderer/services/textMetrics';

describe('textMetrics', () => {
  it('counts non-whitespace text characters for chapters and projects', () => {
    const project: StoryProject = {
      rootPath: '',
      settings: { name: 'Metrics', createdAt: '2026-06-08T00:00:00.000Z', reviewStrictness: 'medium' },
      world: { genre: '', premise: '', rules: [], terms: {} },
      characters: [],
      plot: [],
      chapters: [
        { meta: { id: 1, title: 'One', sceneCount: 1, characters: [], locations: [], timelineDay: 1 }, content: '# One\n\nabc def' },
        { meta: { id: 2, title: 'Two', sceneCount: 1, characters: [], locations: [], timelineDay: 2 }, content: '# Two\n\n中文 内容' }
      ],
      summary: { timeline: [], locations: [], characters: [] },
      workflow: createInitialWorkflowState()
    };

    expect(countTextCharacters('a b\nc')).toBe(3);
    expect(countProjectCharacters(project)).toBe(18);
  });
});
