import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { createProject, loadProject, saveProjectFile } from '../main/projectStore';

let cleanupPath = '';

afterEach(async () => {
  if (cleanupPath) {
    await rm(cleanupPath, { recursive: true, force: true });
    cleanupPath = '';
  }
});

describe('workflow persistence', () => {
  it('creates and loads default workflow state', async () => {
    cleanupPath = await mkdtemp(join(tmpdir(), 'storyforge-workflow-'));
    const projectPath = join(cleanupPath, 'Story');

    const project = await createProject(projectPath, 'Workflow Story');

    expect(project.workflow.currentStage).toBe('intake');
    expect(project.workflow.stages.intake.status).toBe('draft');
    expect(await readFile(join(projectPath, 'workflow', 'state.json'), 'utf8')).toContain('"currentStage"');
  });

  it('loads existing workflow state and falls back for old projects', async () => {
    cleanupPath = await mkdtemp(join(tmpdir(), 'storyforge-workflow-'));
    const projectPath = join(cleanupPath, 'Story');
    await createProject(projectPath, 'Workflow Story');
    await saveProjectFile(
      projectPath,
      'workflow/state.json',
      JSON.stringify({
        currentStage: 'world_outline',
        stages: {
          intake: { status: 'confirmed', confirmedAt: '2026-06-09T00:00:00.000Z' },
          world_outline: { status: 'draft' },
          character_bible: { status: 'locked' },
          act_timeline: { status: 'locked' },
          scene_outline: { status: 'locked' },
          chapter_draft: { status: 'locked' },
          act_scoring: { status: 'locked' },
          full_review: { status: 'optional' }
        },
        artifacts: {},
        memory: { characterStates: [], foreshadowing: [], recentEvents: [], workingMemory: [] }
      })
    );

    const loaded = await loadProject(projectPath);

    expect(loaded.workflow.currentStage).toBe('world_outline');
    expect(loaded.workflow.stages.intake.status).toBe('confirmed');
  });

  it('repairs malformed persisted workflow state', async () => {
    cleanupPath = await mkdtemp(join(tmpdir(), 'storyforge-workflow-'));
    const projectPath = join(cleanupPath, 'Story');
    await createProject(projectPath, 'Workflow Story');
    await saveProjectFile(projectPath, 'workflow/state.json', JSON.stringify({ currentStage: 'intake', stages: {} }));

    const loaded = await loadProject(projectPath);

    expect(loaded.workflow.currentStage).toBe('world_outline');
    expect(loaded.workflow.stages.world_outline.status).toBe('draft');
  });

  it('refuses to overwrite workflow state with malformed JSON', async () => {
    cleanupPath = await mkdtemp(join(tmpdir(), 'storyforge-workflow-'));
    const projectPath = join(cleanupPath, 'Story');
    await createProject(projectPath, 'Workflow Story');
    const statePath = join(projectPath, 'workflow', 'state.json');
    const original = await readFile(statePath, 'utf8');

    await expect(saveProjectFile(projectPath, 'workflow/state.json', '{"currentStage":')).rejects.toThrow(
      'Invalid JSON for workflow/state.json'
    );

    expect(await readFile(statePath, 'utf8')).toBe(original);
  });

  it('migrates a missing workflow state without changing existing character assets', async () => {
    cleanupPath = await mkdtemp(join(tmpdir(), 'storyforge-workflow-'));
    const projectPath = join(cleanupPath, 'Story');
    await createProject(projectPath, 'Workflow Story');
    await saveProjectFile(projectPath, 'characters/protagonist.json', JSON.stringify([
      { id: 'mira', name: 'Mira', role: 'Archivist', motivation: 'Recover a ledger.', flaw: 'Distrustful.', arc: 'Learns to rely on others.' }
    ]));
    await saveProjectFile(projectPath, 'world/bible.json', JSON.stringify({
      genre: 'Mystery', premise: 'Memories can be traded in the archive city.', rules: [], terms: {}
    }));
    await rm(join(projectPath, 'workflow', 'state.json'));

    const loaded = await loadProject(projectPath);

    expect(loaded.workflow.artifacts.characterBible).toEqual(loaded.characters);
    expect(loaded.workflow.stages.character_bible.status).toBe('confirmed');
    expect(await readFile(join(projectPath, 'workflow', 'state.json'), 'utf8')).toContain('characterBible');
  });
});
