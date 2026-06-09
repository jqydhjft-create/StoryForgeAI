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

    expect(loaded.workflow.currentStage).toBe('intake');
    expect(loaded.workflow.stages.world_outline.status).toBe('locked');
  });
});
