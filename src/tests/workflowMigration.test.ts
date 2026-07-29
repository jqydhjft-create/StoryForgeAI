import { describe, expect, it } from 'vitest';
import type { CharacterProfile, StoryProject } from '../shared/types';
import { createInitialWorkflowState } from '../shared/workflowDefaults';
import { migrateLegacyWorkflow } from '../shared/workflowMigration';

const mira: CharacterProfile = {
  id: 'mira',
  name: 'Mira',
  role: 'Archivist',
  motivation: 'Recover the lost ledger.',
  flaw: 'She trusts records more than people.',
  arc: 'Learns to accept uncertain memory.'
};

function legacyProject(overrides: Partial<StoryProject> = {}): StoryProject {
  return {
    rootPath: 'D:/stories/legacy',
    settings: { name: 'The Lost Ledger', createdAt: '2026-07-27T00:00:00.000Z', reviewStrictness: 'medium' },
    world: { genre: 'Mystery', premise: 'Memories can be traded in the archive city.', rules: ['Every trade erases one memory.'], terms: {} },
    characters: [],
    plot: [],
    chapters: [],
    summary: { timeline: [], locations: [], characters: [] },
    workflow: createInitialWorkflowState(),
    ...overrides
  };
}

describe('workflow migration', () => {
  it('maps existing characters and world text without changing source story assets', () => {
    const source = legacyProject({ characters: [mira], chapters: [] });
    const result = migrateLegacyWorkflow(source);

    expect(result.migrated).toBe(true);
    expect(result.workflow.artifacts.characterBible).toEqual([mira]);
    expect(result.workflow.artifacts.worldOutline?.worldDocument).toContain(source.world.premise);
    expect(source.characters).toEqual([mira]);
    expect(result.workflow.currentStage).toBe('act_timeline');
  });

  it('maps only schema-valid legacy plot data and stops at the earliest safe stage', () => {
    const result = migrateLegacyWorkflow(legacyProject({
      plot: [{ id: 'beat-1', label: 'Start', summary: 'A beginning.', chapterHint: 1 }]
    }));

    expect(result.workflow.artifacts.actTimeline).toBeUndefined();
    expect(result.workflow.currentStage).toBe('character_bible');
    expect(result.warnings).toContain('Legacy plot requires act timeline regeneration');
  });

  it('returns an existing valid workflow state unchanged', () => {
    const workflow = createInitialWorkflowState();
    const result = migrateLegacyWorkflow(legacyProject({ workflow }), true);

    expect(result.migrated).toBe(false);
    expect(result.workflow).toBe(workflow);
  });
});
