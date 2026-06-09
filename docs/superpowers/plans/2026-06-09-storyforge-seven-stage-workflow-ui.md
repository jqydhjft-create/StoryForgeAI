# StoryForge Seven-Stage Workflow UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current one-shot assistant path with a user-visible seven-stage workflow that uses the workflow core, plugin registry, strict chapter context packets, and explicit confirmation gates.

**Architecture:** Keep the main application responsible for workflow state, user decisions, project writes, and save gates. Stage generation/review/scoring runs through built-in plugin capabilities. UI state is driven by pure workflow services so the React layer remains a thin orchestrator.

**Tech Stack:** Electron, React, Vite, TypeScript, Vitest.

---

## Scope

This plan implements the first usable seven-stage workflow path:

- Project-level workflow state persistence.
- Built-in plugin capabilities for intake, world/outline, act timeline, scene outline, act scoring, and full review.
- Pure workflow mutation helpers that confirm/regenerate stages and write artifacts.
- A workflow UI panel for the seven stages.
- Chapter draft loop using `ChapterContextPacket`, automatic review, normal save, and force-save second confirmation.
- Non-blocking act scoring and optional full review.

This plan does not implement third-party plugin installation, plugin sandboxing, vector retrieval, or collaborative cloud sync.

## File Structure

- Modify `src/shared/types.ts`
  - Add required workflow state to `StoryProject`.
  - Add persisted artifact file payloads if needed by project storage.
- Create `src/shared/workflowDefaults.ts`
  - Export `createInitialWorkflowState()` for both main and renderer code.
- Modify `src/renderer/services/workflowCore.ts`
  - Reuse the shared default workflow initializer instead of owning a renderer-only copy.
- Modify `src/main/projectStore.ts`
  - Create and load workflow files under `workflow/`.
  - Fall back to `createInitialWorkflowState()` for older projects.
- Modify `src/main/ipc.ts`
  - Continue using generic `project:saveFile`; no new write IPC is needed unless tests prove otherwise.
- Modify `src/renderer/services/plugins/builtinStoryPlugin.ts`
  - Add concrete built-in handlers for stage generation/scoring/review capabilities.
- Create `src/renderer/services/workflowArtifacts.ts`
  - Pure validators and normalizers for plugin outputs.
- Create `src/renderer/services/workflowMutations.ts`
  - Pure project mutation helpers for saving workflow artifacts and stage state.
- Create `src/renderer/services/workflowStageActions.ts`
  - Plugin-backed orchestration for stages 0-3, stage 5, and stage 6.
- Create `src/renderer/services/workflowChapterLoop.ts`
  - Chapter draft context construction, review, save, force-save, and memory update helpers.
- Create `src/renderer/components/WorkflowPanel.tsx`
  - Stage list, confirm/regenerate controls, artifact preview, chapter draft controls, scoring/full-review actions.
- Modify `src/renderer/App.tsx`
  - Own project workflow state and pass workflow actions into `WorkflowPanel`.
- Modify `src/renderer/i18n.ts`
  - Add workflow stage labels and action/status strings.
- Modify `src/renderer/styles.css`
  - Add compact workflow panel styles.
- Add tests:
  - `src/tests/workflowPersistence.test.ts`
  - `src/tests/workflowArtifacts.test.ts`
  - `src/tests/workflowStageActions.test.ts`
  - `src/tests/workflowMutations.test.ts`
  - `src/tests/workflowChapterLoop.test.ts`
  - Extend `src/tests/builtinStoryPlugin.test.ts`
  - Extend `src/tests/i18n.test.ts`

## Task 1: Persist Workflow State In Projects

**Files:**
- Modify: `src/shared/types.ts`
- Create: `src/shared/workflowDefaults.ts`
- Modify: `src/renderer/services/workflowCore.ts`
- Modify: `src/main/projectStore.ts`
- Test: `src/tests/workflowPersistence.test.ts`

- [ ] **Step 1: Write the failing persistence test**

Create `src/tests/workflowPersistence.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
node .\node_modules\vitest\vitest.mjs run src/tests/workflowPersistence.test.ts
```

Expected: FAIL because `StoryProject` has no `workflow` field and `projectStore` does not create `workflow/state.json`.

- [ ] **Step 3: Add workflow to project types and storage**

Implementation requirements:

```ts
// src/shared/types.ts
export interface StoryProject {
  rootPath: string;
  settings: ProjectSettings;
  world: WorldBible;
  characters: CharacterProfile[];
  plot: PlotBeat[];
  chapters: StoryChapter[];
  summary: SummaryData;
  workflow: StoryWorkflowState;
}
```

Create `src/shared/workflowDefaults.ts`:

```ts
import type { StoryWorkflowState } from './types.js';

export function createInitialWorkflowState(): StoryWorkflowState {
  return {
    currentStage: 'intake',
    stages: {
      intake: { status: 'draft' },
      world_outline: { status: 'locked' },
      act_timeline: { status: 'locked' },
      scene_outline: { status: 'locked' },
      chapter_draft: { status: 'locked' },
      act_scoring: { status: 'locked' },
      full_review: { status: 'optional' }
    },
    artifacts: {},
    memory: {
      characterStates: [],
      foreshadowing: [],
      recentEvents: [],
      workingMemory: []
    }
  };
}
```

In `src/renderer/services/workflowCore.ts`, import and re-export the shared initializer:

```ts
export { createInitialWorkflowState } from '../../shared/workflowDefaults.js';
```

In `src/main/projectStore.ts`, import from shared:

```ts
import { createInitialWorkflowState } from '../shared/workflowDefaults.js';
```

Create `workflow/` in `createProject`, write `workflow/state.json`, and load it in `loadProject`. If the file is missing, use `createInitialWorkflowState()`.

- [ ] **Step 4: Run focused test and project store tests**

Run:

```bash
node .\node_modules\vitest\vitest.mjs run src/tests/workflowPersistence.test.ts src/tests/projectStore.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/types.ts src/shared/workflowDefaults.ts src/renderer/services/workflowCore.ts src/main/projectStore.ts src/tests/workflowPersistence.test.ts
git commit -m "feat: persist story workflow state"
```

## Task 2: Add Stage Plugin Capabilities

**Files:**
- Modify: `src/renderer/services/plugins/builtinStoryPlugin.ts`
- Modify: `src/tests/builtinStoryPlugin.test.ts`

- [ ] **Step 1: Write failing tests for real stage capabilities**

Append to `src/tests/builtinStoryPlugin.test.ts`:

```ts
it('maps initial brief, world outline, timeline, scene outline, act scoring, and full review to built-in skills', async () => {
  const calls: StorySkillRequest[] = [];
  const runner = async (request: StorySkillRequest): Promise<StorySkillResponse> => {
    calls.push(request);
    return { skillId: request.skillId, provider: 'mock', output: { status: 'passed', summary: request.skillId } };
  };

  const plugin = createBuiltinStoryPlugin(runner);

  await plugin.capabilities.generate_initial_brief?.({ idea: 'A city of memories.' });
  await plugin.capabilities.generate_world_and_outline?.({ initialSettingBook: {} });
  await plugin.capabilities.generate_act_timeline?.({ worldOutline: {} });
  await plugin.capabilities.generate_scene_outline?.({ actTimeline: {} });
  await plugin.capabilities.score_act?.({ actId: 'act-1' });
  await plugin.capabilities.review_full_text?.({ chapters: [] });

  expect(calls.map((call) => call.skillId)).toEqual([
    'theme-generator',
    'world-generator',
    'plot-designer',
    'plot-designer',
    'integrated-gate',
    'integrated-gate'
  ]);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
node .\node_modules\vitest\vitest.mjs run src/tests/builtinStoryPlugin.test.ts
```

Expected: FAIL because the built-in plugin only exposes `write_chapter` and `review_chapter`.

- [ ] **Step 3: Implement the concrete built-in capabilities**

In `createBuiltinStoryPlugin`, add handlers:

```ts
generate_initial_brief: (input) => runMappedSkill(runner, 'theme-generator', input),
generate_world_and_outline: async (input) => {
  const worldDocument = await runMappedSkill(runner, 'world-generator', input);
  const masterOutline = await runMappedSkill(runner, 'plot-designer', { input, worldDocument });
  return { worldDocument, masterOutline };
},
generate_act_timeline: (input) => runMappedSkill(runner, 'plot-designer', input),
generate_scene_outline: (input) => runMappedSkill(runner, 'plot-designer', input),
score_act: (input) => runMappedSkill(runner, 'integrated-gate', input),
review_full_text: (input) => runMappedSkill(runner, 'integrated-gate', input),
```

Keep unsupported capabilities unadvertised.

- [ ] **Step 4: Run focused test**

Run:

```bash
node .\node_modules\vitest\vitest.mjs run src/tests/builtinStoryPlugin.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/services/plugins/builtinStoryPlugin.ts src/tests/builtinStoryPlugin.test.ts
git commit -m "feat: add workflow stage plugin capabilities"
```

## Task 3: Validate Workflow Artifacts

**Files:**
- Create: `src/renderer/services/workflowArtifacts.ts`
- Test: `src/tests/workflowArtifacts.test.ts`

- [ ] **Step 1: Write failing artifact validation tests**

Create `src/tests/workflowArtifacts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  normalizeActScoreReport,
  normalizeActTimeline,
  normalizeInitialSettingBook,
  normalizeSceneOutline,
  normalizeWorldOutline
} from '../renderer/services/workflowArtifacts';

describe('workflowArtifacts', () => {
  it('normalizes stage artifacts from plugin output', () => {
    expect(normalizeInitialSettingBook({
      genre: 'Mystery',
      worldPremise: 'Memories are stored in ledgers.',
      protagonist: 'Mira',
      coreConflict: 'Truth versus survival',
      readerFeeling: 'Uneasy wonder',
      targetLength: '80k words',
      requiredElements: ['archives']
    }).genre).toBe('Mystery');

    expect(normalizeWorldOutline({ worldDocument: 'World', masterOutline: 'Outline' }).masterOutline).toBe('Outline');
    expect(normalizeActTimeline({ acts: [{ id: 'act-1', title: 'Opening', time: 'Day 1', location: 'Archive', characters: ['Mira'], movement: 'Find ledger', summary: 'Mira finds the ledger.' }] }).acts[0].id).toBe('act-1');
    expect(normalizeSceneOutline({ acts: [{ actId: 'act-1', summary: 'Opening act', chapters: [] }] }).acts[0].actId).toBe('act-1');
    expect(normalizeActScoreReport({ actId: 'act-1', plotContinuity: 8, characterConsistency: 7, pacingControl: 6, detailRichness: 8, comment: 'Solid.' }).plotContinuity).toBe(8);
  });

  it('rejects malformed artifacts with clear errors', () => {
    expect(() => normalizeInitialSettingBook({ genre: 'Mystery' })).toThrow('Invalid initial setting book');
    expect(() => normalizeActTimeline({ acts: [{ id: 'act-1' }] })).toThrow('Invalid act timeline');
    expect(() => normalizeActScoreReport({ actId: 'act-1', plotContinuity: 11 })).toThrow('Invalid act score');
  });
});
```

- [ ] **Step 2: Run focused test and verify it fails**

Run:

```bash
node .\node_modules\vitest\vitest.mjs run src/tests/workflowArtifacts.test.ts
```

Expected: FAIL because `workflowArtifacts.ts` does not exist.

- [ ] **Step 3: Implement validators**

Create `src/renderer/services/workflowArtifacts.ts` with pure validators for:

- `InitialSettingBook`
- `WorldOutlineArtifact`
- `ActTimeline`
- `SceneOutlineArtifact`
- `ActScoreReport`

Every validator must clone the accepted object and throw the exact error messages used in the tests.

- [ ] **Step 4: Run focused test**

Run:

```bash
node .\node_modules\vitest\vitest.mjs run src/tests/workflowArtifacts.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/services/workflowArtifacts.ts src/tests/workflowArtifacts.test.ts
git commit -m "feat: validate workflow artifacts"
```

## Task 4: Add Workflow Mutations

**Files:**
- Create: `src/renderer/services/workflowMutations.ts`
- Test: `src/tests/workflowMutations.test.ts`

- [ ] **Step 1: Write failing mutation tests**

Create `src/tests/workflowMutations.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { StoryProject } from '../shared/types';
import { createInitialWorkflowState } from '../renderer/services/workflowCore';
import { confirmWorkflowArtifact, requestWorkflowRegeneration } from '../renderer/services/workflowMutations';

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
    const result = confirmWorkflowArtifact(project(), 'intake', {
      genre: 'Mystery',
      worldPremise: 'Memory ledgers.',
      protagonist: 'Mira',
      coreConflict: 'Truth versus safety',
      readerFeeling: 'Uneasy wonder',
      targetLength: '80k',
      requiredElements: []
    }, '2026-06-09T00:00:00.000Z');

    expect(result.project.workflow.currentStage).toBe('world_outline');
    expect(result.project.workflow.artifacts.initialSettingBook?.genre).toBe('Mystery');
    expect(result.files.map((file) => file.relativePath)).toEqual(['workflow/state.json']);
  });

  it('locks downstream stages when an upstream confirmed artifact is regenerated', () => {
    const first = confirmWorkflowArtifact(project(), 'intake', {
      genre: 'Mystery',
      worldPremise: 'Memory ledgers.',
      protagonist: 'Mira',
      coreConflict: 'Truth versus safety',
      readerFeeling: 'Uneasy wonder',
      targetLength: '80k',
      requiredElements: []
    }, '2026-06-09T00:00:00.000Z');

    const result = requestWorkflowRegeneration(first.project, 'intake', '2026-06-09T01:00:00.000Z');

    expect(result.project.workflow.stages.intake.status).toBe('regenerating');
    expect(result.project.workflow.stages.world_outline.status).toBe('locked');
    expect(result.files[0].relativePath).toBe('workflow/state.json');
  });
});
```

- [ ] **Step 2: Run focused test and verify it fails**

Run:

```bash
node .\node_modules\vitest\vitest.mjs run src/tests/workflowMutations.test.ts
```

Expected: FAIL because `workflowMutations.ts` does not exist.

- [ ] **Step 3: Implement mutation helpers**

Create `src/renderer/services/workflowMutations.ts`:

- `confirmWorkflowArtifact(project, stage, artifact, confirmedAt)`
- `requestWorkflowRegeneration(project, stage, regeneratedAt)`
- `buildWorkflowStateFile(workflow)`

Use existing `confirmWorkflowStage` and `requestStageRegeneration` from `workflowCore`. Always write only `workflow/state.json` in this slice.

- [ ] **Step 4: Run focused tests**

Run:

```bash
node .\node_modules\vitest\vitest.mjs run src/tests/workflowMutations.test.ts src/tests/workflowCore.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/services/workflowMutations.ts src/tests/workflowMutations.test.ts
git commit -m "feat: add workflow project mutations"
```

## Task 5: Add Plugin-Backed Stage Actions

**Files:**
- Create: `src/renderer/services/workflowStageActions.ts`
- Test: `src/tests/workflowStageActions.test.ts`

- [ ] **Step 1: Write failing action tests**

Create `src/tests/workflowStageActions.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { StoryPlugin } from '../renderer/services/plugins/storyPluginTypes';
import { createStoryPluginRegistry } from '../renderer/services/plugins/storyPluginRegistry';
import { generateStageArtifact } from '../renderer/services/workflowStageActions';

describe('workflowStageActions', () => {
  it('generates and validates intake artifact through plugins', async () => {
    const plugin: StoryPlugin = {
      id: 'test',
      capabilities: {
        generate_initial_brief: async () => ({
          genre: 'Mystery',
          worldPremise: 'Memory ledgers.',
          protagonist: 'Mira',
          coreConflict: 'Truth versus safety',
          readerFeeling: 'Uneasy wonder',
          targetLength: '80k',
          requiredElements: []
        })
      }
    };

    const artifact = await generateStageArtifact(createStoryPluginRegistry([plugin]), 'intake', { idea: 'Memory ledgers.' });

    expect(artifact.genre).toBe('Mystery');
  });

  it('throws clear errors for locked or unsupported stage actions', async () => {
    await expect(generateStageArtifact(createStoryPluginRegistry([]), 'intake', {})).rejects.toThrow(
      'No story plugin registered for generate_initial_brief'
    );
    await expect(generateStageArtifact(createStoryPluginRegistry([]), 'chapter_draft', {})).rejects.toThrow(
      'Chapter draft uses workflowChapterLoop'
    );
  });
});
```

- [ ] **Step 2: Run focused test and verify it fails**

Run:

```bash
node .\node_modules\vitest\vitest.mjs run src/tests/workflowStageActions.test.ts
```

Expected: FAIL because `workflowStageActions.ts` does not exist.

- [ ] **Step 3: Implement stage action orchestration**

Create `src/renderer/services/workflowStageActions.ts` with:

- `generateStageArtifact(registry, stage, input)`
- Map:
  - `intake` -> `generate_initial_brief` -> `normalizeInitialSettingBook`
  - `world_outline` -> `generate_world_and_outline` -> `normalizeWorldOutline`
  - `act_timeline` -> `generate_act_timeline` -> `normalizeActTimeline`
  - `scene_outline` -> `generate_scene_outline` -> `normalizeSceneOutline`
  - `act_scoring` -> `score_act` -> `normalizeActScoreReport`
  - `full_review` -> `review_full_text` -> `ChapterReviewReport` validator
- Throw `Chapter draft uses workflowChapterLoop` for `chapter_draft`.

- [ ] **Step 4: Run focused tests**

Run:

```bash
node .\node_modules\vitest\vitest.mjs run src/tests/workflowStageActions.test.ts src/tests/workflowArtifacts.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/services/workflowStageActions.ts src/tests/workflowStageActions.test.ts
git commit -m "feat: add plugin-backed workflow stage actions"
```

## Task 6: Add Chapter Loop Service

**Files:**
- Create: `src/renderer/services/workflowChapterLoop.ts`
- Test: `src/tests/workflowChapterLoop.test.ts`

- [ ] **Step 1: Write failing chapter loop tests**

Create `src/tests/workflowChapterLoop.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { StoryProject } from '../shared/types';
import type { StoryPlugin } from '../renderer/services/plugins/storyPluginTypes';
import { createStoryPluginRegistry } from '../renderer/services/plugins/storyPluginRegistry';
import { createInitialWorkflowState } from '../renderer/services/workflowCore';
import { generateWorkflowChapterDraft, forceSaveWorkflowChapterDraft } from '../renderer/services/workflowChapterLoop';

function project(): StoryProject {
  return {
    rootPath: '',
    settings: { name: 'Story', createdAt: '2026-06-09T00:00:00.000Z', reviewStrictness: 'medium' },
    world: { genre: '', premise: '', rules: [], terms: {} },
    characters: [],
    plot: [],
    chapters: [{ meta: { id: 1, title: 'One', sceneCount: 1, characters: ['Mira'], locations: ['Archive'], timelineDay: 1 }, content: '# One\n\nText.' }],
    summary: { timeline: [], locations: [], characters: [] },
    workflow: {
      ...createInitialWorkflowState(),
      artifacts: {
        actTimeline: { acts: [{ id: 'act-1', title: 'Act 1', time: 'Day 1', location: 'Archive', characters: ['Mira'], movement: 'Find ledger', summary: 'Mira finds the ledger.' }] },
        sceneOutline: { acts: [{ actId: 'act-1', summary: 'Mira finds the ledger.', chapters: [{ id: 'c2', actId: 'act-1', chapterId: 2, target: 'Open the ledger.', scenes: [], anchors: [] }] }] }
      },
      memory: { characterStates: [], foreshadowing: [], recentEvents: [], workingMemory: [] }
    }
  };
}

describe('workflowChapterLoop', () => {
  it('builds strict context, writes a draft, and blocks save on review issues', async () => {
    const plugin: StoryPlugin = {
      id: 'test',
      capabilities: {
        write_chapter: async () => ({ chapter: { meta: { id: 2, title: 'Two', sceneCount: 1, characters: ['Mira'], locations: ['Archive'], timelineDay: 2 }, content: '# Two\n\nDraft.' } }),
        review_chapter: async () => ({ status: 'issues_found', summary: 'One issue.', issues: [{ id: 'i1', severity: 'warning', message: 'Check ledger location.' }] })
      }
    };

    const result = await generateWorkflowChapterDraft(createStoryPluginRegistry([plugin]), project(), 'act-1', 2);

    expect(result.contextPacket.recentChapterTexts.map((chapter) => chapter.id)).toEqual([1]);
    expect(result.review.status).toBe('issues_found');
    expect(result.saveDecision).toBe('blocked_by_review');
  });

  it('requires second confirmation for force-save', () => {
    expect(forceSaveWorkflowChapterDraft({ secondConfirmation: false }).allowed).toBe(false);
    expect(forceSaveWorkflowChapterDraft({ secondConfirmation: true }).allowed).toBe(true);
  });
});
```

- [ ] **Step 2: Run focused test and verify it fails**

Run:

```bash
node .\node_modules\vitest\vitest.mjs run src/tests/workflowChapterLoop.test.ts
```

Expected: FAIL because `workflowChapterLoop.ts` does not exist.

- [ ] **Step 3: Implement chapter loop service**

Create `src/renderer/services/workflowChapterLoop.ts`:

- Build context with `buildChapterContextPacket`.
- Generate/review with `generateReviewedChapterDraft`.
- Return `{ contextPacket, chapter, review, saveDecision }`.
- Re-export force-save behavior through `forceSaveDraftAfterWarning`.
- Throw clear errors when timeline or scene outline artifacts are missing.

- [ ] **Step 4: Run focused tests**

Run:

```bash
node .\node_modules\vitest\vitest.mjs run src/tests/workflowChapterLoop.test.ts src/tests/chapterContext.test.ts src/tests/chapterDraftWorkflow.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/services/workflowChapterLoop.ts src/tests/workflowChapterLoop.test.ts
git commit -m "feat: add workflow chapter draft loop"
```

## Task 7: Add Workflow Panel UI

**Files:**
- Create: `src/renderer/components/WorkflowPanel.tsx`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/i18n.ts`
- Modify: `src/renderer/styles.css`
- Test: `src/tests/i18n.test.ts`

- [ ] **Step 1: Write failing i18n tests for workflow labels**

Append to `src/tests/i18n.test.ts`:

```ts
it('translates workflow stage labels and actions', () => {
  expect(t('en', 'workflow.stage.intake')).toBe('Intake');
  expect(t('en', 'workflow.stage.world_outline')).toBe('World + Outline');
  expect(t('en', 'workflow.confirm')).toBe('Confirm');
  expect(t('en', 'workflow.regenerate')).toBe('Regenerate');
  expect(t('zh-CN', 'workflow.forceSave')).toBe('强制保存');
});
```

- [ ] **Step 2: Run i18n test and verify it fails**

Run:

```bash
node .\node_modules\vitest\vitest.mjs run src/tests/i18n.test.ts
```

Expected: FAIL because workflow keys do not exist.

- [ ] **Step 3: Add translations**

Add keys:

- `workflow.stage.intake`
- `workflow.stage.world_outline`
- `workflow.stage.act_timeline`
- `workflow.stage.scene_outline`
- `workflow.stage.chapter_draft`
- `workflow.stage.act_scoring`
- `workflow.stage.full_review`
- `workflow.confirm`
- `workflow.regenerate`
- `workflow.forceSave`
- `workflow.generate`
- `workflow.reviewBlocked`
- `workflow.scoreAct`
- `workflow.fullReview`

- [ ] **Step 4: Create `WorkflowPanel.tsx`**

Create a compact component with props:

```ts
interface WorkflowPanelProps {
  language: Language;
  workflow: StoryWorkflowState;
  activeArtifactText: string;
  isBusy: boolean;
  onGenerateStage: (stage: WorkflowStageId) => void;
  onConfirmStage: (stage: WorkflowStageId) => void;
  onRegenerateStage: (stage: WorkflowStageId) => void;
  onGenerateChapter: () => void;
  onScoreAct: () => void;
  onFullReview: () => void;
}
```

Render:

- Ordered seven-stage list.
- Current stage highlighted.
- Generate, confirm, and regenerate buttons when stage is not locked.
- Artifact preview textarea.
- Dedicated chapter draft controls for `chapter_draft`.
- Score/full review controls for stages 5 and 6.

- [ ] **Step 5: Wire `WorkflowPanel` into `App.tsx`**

Use current project workflow state:

```ts
const workflow = project.workflow;
```

Create handlers:

- `generateWorkflowStage`
- `confirmCurrentWorkflowStage`
- `regenerateWorkflowStage`

Use services from Tasks 4-6. Keep project file writes going through `applyProjectMutation` or `saveProjectFiles`.

- [ ] **Step 6: Add CSS**

Add compact styles:

- `.workflow-panel`
- `.workflow-stage-list`
- `.workflow-stage-current`
- `.workflow-artifact-preview`
- `.workflow-actions`

Use fixed spacing and avoid nested cards.

- [ ] **Step 7: Run verification**

Run:

```bash
node .\node_modules\vitest\vitest.mjs run src/tests/i18n.test.ts
node .\node_modules\typescript\bin\tsc --noEmit
node .\node_modules\vite\bin\vite.js build
```

Expected: PASS.

- [ ] **Step 8: Browser smoke check**

Start Vite if needed:

```bash
node .\node_modules\vite\bin\vite.js --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173/` and verify:

- Start screen renders.
- After loading a project in Electron, workflow panel shows seven stages.
- Summary and assistant tabs still fit within the right panel.

- [ ] **Step 9: Commit**

```bash
git add src/renderer/components/WorkflowPanel.tsx src/renderer/App.tsx src/renderer/i18n.ts src/renderer/styles.css src/tests/i18n.test.ts
git commit -m "feat: add seven-stage workflow panel"
```

## Task 8: Full Verification

**Files:**
- Modify only files needed for verification failures.

- [ ] **Step 1: Run all tests**

Run:

```bash
node .\node_modules\vitest\vitest.mjs run
```

Expected: PASS with all test files.

- [ ] **Step 2: Run type checks**

Run:

```bash
node .\node_modules\typescript\bin\tsc --noEmit
node .\node_modules\typescript\bin\tsc -p tsconfig.node.json --noEmit
```

Expected: both commands exit 0.

- [ ] **Step 3: Run production build**

Run:

```bash
node .\node_modules\typescript\bin\tsc -p tsconfig.node.json
node .\node_modules\vite\bin\vite.js build
```

Expected: build exits 0 and emits `dist/` assets.

- [ ] **Step 4: Request code review**

Ask a review agent to check:

- Stage transition correctness.
- Plugin boundary compliance.
- Chapter context budget.
- Save and force-save gates.
- Project path safety.
- UI reachability for all seven stages.

- [ ] **Step 5: Fix Critical and Important review findings**

For every accepted review finding, write or update a test first, verify it fails, implement the fix, and rerun focused tests.

- [ ] **Step 6: Commit verification fixes**

If fixes were needed:

```bash
git add src docs
git commit -m "fix: stabilize seven-stage workflow UI"
```

If no fixes were needed, do not create an empty commit.

## Self-Review Notes

Spec coverage:

- Seven visible stages are covered by Task 7.
- Confirmation and regeneration gates are covered by Task 4.
- Plugin-backed generation/review/scoring/full review is covered by Tasks 2, 5, and 6.
- Strict chapter context packet is covered by Task 6.
- Persistence is covered by Task 1.
- Context-budget protection is preserved by using `ChapterContextPacket` and focused artifact inputs.

Placeholder scan:

- The plan contains no TBD/TODO placeholders.
- Every task has exact files, focused tests, commands, and expected results.

Type consistency:

- `StoryProject.workflow` is introduced before UI and mutation tasks consume it.
- `WorkflowStageId`, `StoryWorkflowState`, and artifact names match `src/shared/types.ts`.
- Chapter draft services reuse existing `ChapterContextPacket` and `generateReviewedChapterDraft` contracts.
