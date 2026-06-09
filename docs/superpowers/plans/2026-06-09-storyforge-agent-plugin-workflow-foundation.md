# StoryForge Agent Plugin Workflow Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first foundation slice for the new workflow-led, stage-agent, built-in-plugin architecture without replacing the full UI in the same change set.

**Architecture:** Add shared workflow and plugin contracts, introduce a built-in plugin registry, migrate existing skill requests behind plugin capability adapters, and add the strict chapter context builder. Existing one-shot workflow services remain available through compatibility paths while the new core is introduced.

**Tech Stack:** Electron, React, Vite, TypeScript, Vitest.

---

## Scope

This plan implements the foundation layer only:

- Shared data contracts for stages, artifacts, plugin capabilities, memory, and chapter context packets.
- Built-in plugin registry with testable capability invocation.
- Compatibility adapter from current `StorySkillRunner` and `buildStorySkillRequest`.
- Workflow state model with confirmation and regeneration gates.
- Strict `ChapterContextPacket` construction for chapter drafting.
- Save/force-save decision model for generated chapter drafts.

This plan does not implement the full redesigned UI, third-party plugin installation, plugin sandboxing, cloud sync, or full-text review UI.

## File Structure

- Modify `src/shared/types.ts`
  - Add workflow stage, artifact, memory, plugin, review, scoring, and chapter context contracts.
  - Preserve existing story project and skill request contracts.
- Create `src/renderer/services/plugins/storyPluginTypes.ts`
  - Renderer-side helper types for invoking built-in plugin capabilities.
- Create `src/renderer/services/plugins/builtinStoryPlugin.ts`
  - Built-in capability adapter around existing `StorySkillRunner` and `buildStorySkillRequest`.
- Create `src/renderer/services/plugins/storyPluginRegistry.ts`
  - Registry that stores plugins and invokes a named capability.
- Create `src/renderer/services/workflowCore.ts`
  - Pure functions for initializing workflow state, confirming stages, requesting regeneration, and finding the next stage.
- Create `src/renderer/services/chapterContext.ts`
  - Pure functions for strict chapter context packet construction.
- Create `src/renderer/services/chapterDraftWorkflow.ts`
  - Pure orchestration for draft generation, editor review, and save decision state.
- Test `src/tests/workflowContracts.test.ts`
  - Locks the shape of shared contracts with concrete examples.
- Test `src/tests/storyPluginRegistry.test.ts`
  - Verifies registry lookup, capability invocation, and missing capability errors.
- Test `src/tests/builtinStoryPlugin.test.ts`
  - Verifies built-in plugin maps new capabilities to current story skills.
- Test `src/tests/workflowCore.test.ts`
  - Verifies stage transitions, confirmation gates, and regeneration state.
- Test `src/tests/chapterContext.test.ts`
  - Verifies strict context packet construction and avoids full project loading.
- Test `src/tests/chapterDraftWorkflow.test.ts`
  - Verifies draft generation, automatic review, and force-save second confirmation state.

## Task 1: Shared Workflow Contracts

**Files:**
- Modify: `src/shared/types.ts`
- Test: `src/tests/workflowContracts.test.ts`

- [ ] **Step 1: Write the failing contract test**

Create `src/tests/workflowContracts.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type {
  ActTimeline,
  ChapterContextPacket,
  StoryPluginCapability,
  StoryWorkflowState
} from '../shared/types';

describe('workflow contracts', () => {
  it('describes the seven-stage workflow state with confirmation status', () => {
    const state: StoryWorkflowState = {
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

    expect(state.currentStage).toBe('intake');
    expect(state.stages.full_review.status).toBe('optional');
  });

  it('describes act timelines and strict chapter context packets', () => {
    const timeline: ActTimeline = {
      acts: [
        {
          id: 'act-1',
          title: 'Opening',
          time: 'Day 1',
          location: 'Archive',
          characters: ['Mira'],
          movement: 'Mira finds the missing ledger.',
          summary: 'Mira enters the archive and finds evidence of a hidden pact.'
        }
      ]
    };

    const packet: ChapterContextPacket = {
      currentChapterTarget: 'Reveal the ledger without resolving the pact.',
      currentActOutline: timeline.acts[0],
      anchors: [{ id: 'a1', text: 'Echo Act 1 Chapter 1: hidden pact', actId: 'act-1', chapterId: 1 }],
      stateMachine: {
        characterStates: [{ name: 'Mira', role: 'Archivist', status: 'Suspicious of the council' }],
        foreshadowing: [{ id: 'f1', text: 'The pact requires a witness.', status: 'open' }]
      },
      previousActSummary: 'The city lost its public memory.',
      currentActSummary: 'Mira investigates the archive.',
      recentChapterTexts: [{ id: 1, title: 'Chapter 1', content: 'Mira opened the sealed drawer.' }],
      matchedHistoryFragments: [{ source: 'act-0', text: 'The council erased witness records.' }]
    };

    expect(packet.currentActOutline.id).toBe('act-1');
    expect(packet.recentChapterTexts).toHaveLength(1);
    expect(packet.matchedHistoryFragments[0].source).toBe('act-0');
  });

  it('enumerates built-in plugin capabilities', () => {
    const capability: StoryPluginCapability = 'write_chapter';

    expect(capability).toBe('write_chapter');
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/tests/workflowContracts.test.ts
```

Expected: FAIL because `ActTimeline`, `ChapterContextPacket`, `StoryPluginCapability`, and `StoryWorkflowState` are not exported.

- [ ] **Step 3: Add the shared contracts**

Append these contracts to `src/shared/types.ts`:

```ts
export type WorkflowStageId =
  | 'intake'
  | 'world_outline'
  | 'act_timeline'
  | 'scene_outline'
  | 'chapter_draft'
  | 'act_scoring'
  | 'full_review';

export type WorkflowStageStatus = 'locked' | 'draft' | 'confirmed' | 'regenerating' | 'optional';

export interface WorkflowStageState {
  status: WorkflowStageStatus;
  confirmedAt?: string;
  regeneratedAt?: string;
}

export interface InitialSettingBook {
  genre: string;
  worldPremise: string;
  protagonist: string;
  coreConflict: string;
  readerFeeling: string;
  targetLength: string;
  requiredElements: string[];
}

export interface WorldOutlineArtifact {
  worldDocument: string;
  masterOutline: string;
}

export interface ActTimelineItem {
  id: string;
  title: string;
  time: string;
  location: string;
  characters: string[];
  movement: string;
  summary: string;
}

export interface ActTimeline {
  acts: ActTimelineItem[];
}

export interface StoryAnchor {
  id: string;
  text: string;
  actId: string;
  chapterId?: number;
}

export interface SceneOutlineItem {
  id: string;
  actId: string;
  chapterId: number;
  target: string;
  scenes: Array<{ id: string; summary: string; characters: string[]; location: string }>;
  anchors: StoryAnchor[];
}

export interface SceneOutlineArtifact {
  acts: Array<{ actId: string; summary: string; chapters: SceneOutlineItem[] }>;
}

export interface CharacterState {
  name: string;
  role: string;
  status: string;
}

export interface ForeshadowingItem {
  id: string;
  text: string;
  status: 'open' | 'echoed' | 'resolved';
}

export interface StoryStateMachine {
  characterStates: CharacterState[];
  foreshadowing: ForeshadowingItem[];
  locationStates?: Array<{ name: string; status: string }>;
  objectStates?: Array<{ name: string; status: string }>;
  activeWorldRules?: string[];
  openConflicts?: string[];
}

export interface StoryMemoryState extends StoryStateMachine {
  recentEvents: Array<{ chapterId: number; summary: string }>;
  workingMemory: string[];
}

export interface MatchedHistoryFragment {
  source: string;
  text: string;
}

export interface ChapterContextPacket {
  currentChapterTarget: string;
  currentActOutline: ActTimelineItem;
  anchors: StoryAnchor[];
  stateMachine: StoryStateMachine;
  previousActSummary: string;
  currentActSummary: string;
  recentChapterTexts: Array<{ id: number; title: string; content: string }>;
  matchedHistoryFragments: MatchedHistoryFragment[];
}

export interface ChapterReviewIssue {
  id: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  location?: string;
}

export interface ChapterReviewReport {
  status: 'passed' | 'issues_found';
  summary: string;
  issues: ChapterReviewIssue[];
}

export interface ActScoreReport {
  actId: string;
  plotContinuity: number;
  characterConsistency: number;
  pacingControl: number;
  detailRichness: number;
  comment: string;
}

export interface StoryWorkflowArtifacts {
  initialSettingBook?: InitialSettingBook;
  worldOutline?: WorldOutlineArtifact;
  actTimeline?: ActTimeline;
  sceneOutline?: SceneOutlineArtifact;
  chapterReviews?: Record<number, ChapterReviewReport>;
  actScores?: Record<string, ActScoreReport>;
  fullReview?: ChapterReviewReport;
}

export interface StoryWorkflowState {
  currentStage: WorkflowStageId;
  stages: Record<WorkflowStageId, WorkflowStageState>;
  artifacts: StoryWorkflowArtifacts;
  memory: StoryMemoryState;
}

export type StoryPluginCapability =
  | 'generate_initial_brief'
  | 'generate_world_and_outline'
  | 'generate_act_timeline'
  | 'generate_scene_outline'
  | 'write_chapter'
  | 'review_chapter'
  | 'score_act'
  | 'review_full_text'
  | 'lookup_history'
  | 'check_hard_rules'
  | 'mark_inconsistency'
  | 'update_state_machine';
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
npm test -- src/tests/workflowContracts.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the contracts**

Run:

```bash
git add src/shared/types.ts src/tests/workflowContracts.test.ts
git commit -m "feat: add workflow foundation contracts"
```

## Task 2: Built-In Plugin Registry

**Files:**
- Create: `src/renderer/services/plugins/storyPluginTypes.ts`
- Create: `src/renderer/services/plugins/storyPluginRegistry.ts`
- Test: `src/tests/storyPluginRegistry.test.ts`

- [ ] **Step 1: Write the failing registry test**

Create `src/tests/storyPluginRegistry.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { StoryPlugin } from '../renderer/services/plugins/storyPluginTypes';
import { createStoryPluginRegistry } from '../renderer/services/plugins/storyPluginRegistry';

describe('storyPluginRegistry', () => {
  it('invokes a registered plugin capability', async () => {
    const plugin: StoryPlugin = {
      id: 'test-plugin',
      capabilities: {
        write_chapter: async (input) => ({ echoed: input })
      }
    };

    const registry = createStoryPluginRegistry([plugin]);
    const result = await registry.invoke('write_chapter', { chapterId: 2 });

    expect(result).toEqual({ echoed: { chapterId: 2 } });
  });

  it('throws a clear error when no plugin provides the capability', async () => {
    const registry = createStoryPluginRegistry([]);

    await expect(registry.invoke('write_chapter', {})).rejects.toThrow('No story plugin registered for write_chapter');
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/tests/storyPluginRegistry.test.ts
```

Expected: FAIL because registry files do not exist.

- [ ] **Step 3: Add plugin helper types**

Create `src/renderer/services/plugins/storyPluginTypes.ts`:

```ts
import type { StoryPluginCapability } from '../../../shared/types.js';

export type StoryPluginHandler<Input = unknown, Output = unknown> = (input: Input) => Promise<Output>;

export type StoryPluginCapabilityMap = Partial<Record<StoryPluginCapability, StoryPluginHandler>>;

export interface StoryPlugin {
  id: string;
  capabilities: StoryPluginCapabilityMap;
}

export interface StoryPluginRegistry {
  invoke<Input = unknown, Output = unknown>(capability: StoryPluginCapability, input: Input): Promise<Output>;
  listCapabilities(): StoryPluginCapability[];
}
```

- [ ] **Step 4: Add the registry implementation**

Create `src/renderer/services/plugins/storyPluginRegistry.ts`:

```ts
import type { StoryPluginCapability } from '../../../shared/types.js';
import type { StoryPlugin, StoryPluginRegistry } from './storyPluginTypes';

export function createStoryPluginRegistry(plugins: StoryPlugin[]): StoryPluginRegistry {
  return {
    async invoke<Input, Output>(capability: StoryPluginCapability, input: Input): Promise<Output> {
      const plugin = plugins.find((item) => item.capabilities[capability]);
      const handler = plugin?.capabilities[capability];
      if (!handler) {
        throw new Error(`No story plugin registered for ${capability}`);
      }

      return handler(input) as Promise<Output>;
    },

    listCapabilities(): StoryPluginCapability[] {
      const capabilities = new Set<StoryPluginCapability>();
      for (const plugin of plugins) {
        for (const capability of Object.keys(plugin.capabilities) as StoryPluginCapability[]) {
          capabilities.add(capability);
        }
      }
      return Array.from(capabilities.values()).sort();
    }
  };
}
```

- [ ] **Step 5: Run the focused test and verify it passes**

Run:

```bash
npm test -- src/tests/storyPluginRegistry.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit the registry**

Run:

```bash
git add src/renderer/services/plugins/storyPluginTypes.ts src/renderer/services/plugins/storyPluginRegistry.ts src/tests/storyPluginRegistry.test.ts
git commit -m "feat: add story plugin registry"
```

## Task 3: Built-In Skill Adapter Plugin

**Files:**
- Create: `src/renderer/services/plugins/builtinStoryPlugin.ts`
- Test: `src/tests/builtinStoryPlugin.test.ts`

- [ ] **Step 1: Write the failing adapter test**

Create `src/tests/builtinStoryPlugin.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { StorySkillRequest, StorySkillResponse } from '../shared/types';
import { createBuiltinStoryPlugin } from '../renderer/services/plugins/builtinStoryPlugin';

describe('builtinStoryPlugin', () => {
  it('maps write_chapter to the existing next-chapter workshop skill', async () => {
    const calls: StorySkillRequest[] = [];
    const runner = async (request: StorySkillRequest): Promise<StorySkillResponse> => {
      calls.push(request);
      return {
        skillId: request.skillId,
        provider: 'mock',
        output: {
          chapter: {
            meta: { id: 2, title: 'Chapter 2', sceneCount: 1, characters: ['Mira'], locations: ['Archive'], timelineDay: 2 },
            content: '# Chapter 2\n\nMira reads the ledger.'
          },
          reviewNotes: ['Continues the archive thread.']
        }
      };
    };

    const plugin = createBuiltinStoryPlugin(runner);
    const result = await plugin.capabilities.write_chapter?.({ nextChapterId: 2 });

    expect(calls[0].skillId).toBe('next-chapter-workshop');
    expect(result).toEqual({
      chapter: {
        meta: { id: 2, title: 'Chapter 2', sceneCount: 1, characters: ['Mira'], locations: ['Archive'], timelineDay: 2 },
        content: '# Chapter 2\n\nMira reads the ledger.'
      },
      reviewNotes: ['Continues the archive thread.']
    });
  });

  it('maps review_chapter to the current logic detective skill', async () => {
    const calls: StorySkillRequest[] = [];
    const runner = async (request: StorySkillRequest): Promise<StorySkillResponse> => {
      calls.push(request);
      return {
        skillId: request.skillId,
        provider: 'mock',
        output: { status: 'passed', summary: 'No continuity issue.' }
      };
    };

    const plugin = createBuiltinStoryPlugin(runner);
    const result = await plugin.capabilities.review_chapter?.({ chapterId: 2, content: 'Mira reads.' });

    expect(calls[0].skillId).toBe('logic-detective');
    expect(result).toEqual({ status: 'passed', summary: 'No continuity issue.' });
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/tests/builtinStoryPlugin.test.ts
```

Expected: FAIL because `builtinStoryPlugin.ts` does not exist.

- [ ] **Step 3: Add the built-in adapter**

Create `src/renderer/services/plugins/builtinStoryPlugin.ts`:

```ts
import { buildStorySkillRequest, type StorySkillRunner } from '../storySkills';
import type { StoryPlugin } from './storyPluginTypes';

async function runMappedSkill(runner: StorySkillRunner, skillId: Parameters<typeof buildStorySkillRequest>[0], input: unknown) {
  const response = await runner(buildStorySkillRequest(skillId, JSON.stringify(input, null, 2)));
  return response.output;
}

export function createBuiltinStoryPlugin(runner: StorySkillRunner): StoryPlugin {
  return {
    id: 'builtin-story-plugin',
    capabilities: {
      generate_initial_brief: (input) => runMappedSkill(runner, 'theme-generator', input),
      generate_world_and_outline: async (input) => {
        const world = await runMappedSkill(runner, 'world-generator', input);
        const plot = await runMappedSkill(runner, 'plot-designer', { input, world });
        return { world, plot };
      },
      generate_act_timeline: (input) => runMappedSkill(runner, 'plot-designer', input),
      generate_scene_outline: (input) => runMappedSkill(runner, 'plot-designer', input),
      write_chapter: (input) => runMappedSkill(runner, 'next-chapter-workshop', input),
      review_chapter: (input) => runMappedSkill(runner, 'logic-detective', input),
      score_act: (input) => runMappedSkill(runner, 'integrated-gate', input),
      review_full_text: (input) => runMappedSkill(runner, 'integrated-gate', input),
      lookup_history: async (input) => ({ fragments: [], input }),
      check_hard_rules: (input) => runMappedSkill(runner, 'logic-detective', input),
      mark_inconsistency: async (input) => ({ status: 'marked', input }),
      update_state_machine: async (input) => ({ stateMachine: input })
    }
  };
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
npm test -- src/tests/builtinStoryPlugin.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the adapter**

Run:

```bash
git add src/renderer/services/plugins/builtinStoryPlugin.ts src/tests/builtinStoryPlugin.test.ts
git commit -m "feat: add built-in story plugin adapter"
```

## Task 4: Workflow Core State Model

**Files:**
- Create: `src/renderer/services/workflowCore.ts`
- Test: `src/tests/workflowCore.test.ts`

- [ ] **Step 1: Write the failing workflow core test**

Create `src/tests/workflowCore.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  confirmWorkflowStage,
  createInitialWorkflowState,
  findNextWorkflowStage,
  requestStageRegeneration
} from '../renderer/services/workflowCore';

describe('workflowCore', () => {
  it('starts at intake with the remaining required stages locked', () => {
    const state = createInitialWorkflowState();

    expect(state.currentStage).toBe('intake');
    expect(state.stages.intake.status).toBe('draft');
    expect(state.stages.world_outline.status).toBe('locked');
    expect(state.stages.full_review.status).toBe('optional');
  });

  it('confirms a stage and unlocks the next stage', () => {
    const state = createInitialWorkflowState();
    const next = confirmWorkflowStage(state, 'intake', '2026-06-09T00:00:00.000Z');

    expect(next.stages.intake.status).toBe('confirmed');
    expect(next.stages.world_outline.status).toBe('draft');
    expect(next.currentStage).toBe('world_outline');
  });

  it('marks a confirmed stage as regenerating without touching other stages', () => {
    const state = confirmWorkflowStage(createInitialWorkflowState(), 'intake', '2026-06-09T00:00:00.000Z');
    const next = requestStageRegeneration(state, 'intake', '2026-06-09T01:00:00.000Z');

    expect(next.stages.intake.status).toBe('regenerating');
    expect(next.stages.intake.regeneratedAt).toBe('2026-06-09T01:00:00.000Z');
    expect(next.stages.world_outline.status).toBe('draft');
  });

  it('finds the next required stage', () => {
    expect(findNextWorkflowStage('intake')).toBe('world_outline');
    expect(findNextWorkflowStage('act_scoring')).toBe(null);
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/tests/workflowCore.test.ts
```

Expected: FAIL because `workflowCore.ts` does not exist.

- [ ] **Step 3: Add the workflow core implementation**

Create `src/renderer/services/workflowCore.ts`:

```ts
import type { StoryWorkflowState, WorkflowStageId } from '../../shared/types.js';

const orderedRequiredStages: WorkflowStageId[] = [
  'intake',
  'world_outline',
  'act_timeline',
  'scene_outline',
  'chapter_draft',
  'act_scoring'
];

export function findNextWorkflowStage(stage: WorkflowStageId): WorkflowStageId | null {
  const index = orderedRequiredStages.indexOf(stage);
  if (index < 0) return null;
  return orderedRequiredStages[index + 1] ?? null;
}

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

export function confirmWorkflowStage(
  state: StoryWorkflowState,
  stage: WorkflowStageId,
  confirmedAt = new Date().toISOString()
): StoryWorkflowState {
  const nextStage = findNextWorkflowStage(stage);
  return {
    ...state,
    currentStage: nextStage ?? stage,
    stages: {
      ...state.stages,
      [stage]: { ...state.stages[stage], status: 'confirmed', confirmedAt },
      ...(nextStage ? { [nextStage]: { ...state.stages[nextStage], status: 'draft' as const } } : {})
    }
  };
}

export function requestStageRegeneration(
  state: StoryWorkflowState,
  stage: WorkflowStageId,
  regeneratedAt = new Date().toISOString()
): StoryWorkflowState {
  return {
    ...state,
    currentStage: stage,
    stages: {
      ...state.stages,
      [stage]: { ...state.stages[stage], status: 'regenerating', regeneratedAt }
    }
  };
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
npm test -- src/tests/workflowCore.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the workflow core**

Run:

```bash
git add src/renderer/services/workflowCore.ts src/tests/workflowCore.test.ts
git commit -m "feat: add workflow core state model"
```

## Task 5: Strict Chapter Context Builder

**Files:**
- Create: `src/renderer/services/chapterContext.ts`
- Test: `src/tests/chapterContext.test.ts`

- [ ] **Step 1: Write the failing chapter context test**

Create `src/tests/chapterContext.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { ActTimeline, SceneOutlineArtifact, StoryProject, StoryMemoryState } from '../shared/types';
import { buildChapterContextPacket } from '../renderer/services/chapterContext';

function project(): StoryProject {
  return {
    rootPath: '',
    settings: { name: 'Archive Story', createdAt: '2026-06-09T00:00:00.000Z', reviewStrictness: 'medium' },
    world: { genre: 'Mystery', premise: 'A city stores memories in ledgers.', rules: ['Witness records matter.'], terms: {} },
    characters: [],
    plot: [],
    chapters: [
      { meta: { id: 1, title: 'Chapter 1', sceneCount: 1, characters: ['Mira'], locations: ['Archive'], timelineDay: 1 }, content: '# Chapter 1\n\nFirst text.' },
      { meta: { id: 2, title: 'Chapter 2', sceneCount: 1, characters: ['Mira'], locations: ['Archive'], timelineDay: 2 }, content: '# Chapter 2\n\nSecond text.' },
      { meta: { id: 3, title: 'Chapter 3', sceneCount: 1, characters: ['Mira'], locations: ['Vault'], timelineDay: 3 }, content: '# Chapter 3\n\nThird text.' }
    ],
    summary: { timeline: [], locations: [], characters: [] }
  };
}

describe('chapterContext', () => {
  it('builds the strict packet without full project text or full world document', () => {
    const actTimeline: ActTimeline = {
      acts: [
        { id: 'act-1', title: 'Act 1', time: 'Day 1-3', location: 'Archive', characters: ['Mira'], movement: 'Find ledger', summary: 'Mira finds the ledger.' },
        { id: 'act-2', title: 'Act 2', time: 'Day 4-6', location: 'Vault', characters: ['Mira'], movement: 'Open vault', summary: 'Mira opens the vault.' }
      ]
    };
    const sceneOutline: SceneOutlineArtifact = {
      acts: [
        {
          actId: 'act-2',
          summary: 'Mira opens the vault.',
          chapters: [
            {
              id: 'scene-4',
              actId: 'act-2',
              chapterId: 4,
              target: 'Reveal what the vault protects.',
              scenes: [{ id: 's1', summary: 'Mira enters the vault.', characters: ['Mira'], location: 'Vault' }],
              anchors: [{ id: 'anchor-1', text: 'Echo Act 1 Chapter 1: ledger witness', actId: 'act-2', chapterId: 4 }]
            }
          ]
        }
      ]
    };
    const memory: StoryMemoryState = {
      characterStates: [{ name: 'Mira', role: 'Archivist', status: 'Determined' }],
      foreshadowing: [{ id: 'f1', text: 'ledger witness', status: 'open' }],
      recentEvents: [
        { chapterId: 1, summary: 'Mira found the ledger.' },
        { chapterId: 2, summary: 'Mira hid the ledger.' },
        { chapterId: 3, summary: 'Mira reached the vault.' }
      ],
      workingMemory: ['Witness records matter.']
    };

    const packet = buildChapterContextPacket({
      project: project(),
      actTimeline,
      sceneOutline,
      memory,
      actId: 'act-2',
      chapterId: 4
    });

    expect(packet.currentChapterTarget).toBe('Reveal what the vault protects.');
    expect(packet.currentActOutline.id).toBe('act-2');
    expect(packet.anchors).toHaveLength(1);
    expect(packet.recentChapterTexts.map((chapter) => chapter.id)).toEqual([2, 3]);
    expect(packet.previousActSummary).toBe('Mira finds the ledger.');
    expect(packet.currentActSummary).toBe('Mira opens the vault.');
    expect(packet.matchedHistoryFragments[0].text).toContain('ledger');
    expect(JSON.stringify(packet)).not.toContain('A city stores memories in ledgers.');
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/tests/chapterContext.test.ts
```

Expected: FAIL because `chapterContext.ts` does not exist.

- [ ] **Step 3: Add the chapter context builder**

Create `src/renderer/services/chapterContext.ts`:

```ts
import type {
  ActTimeline,
  ChapterContextPacket,
  SceneOutlineArtifact,
  StoryMemoryState,
  StoryProject
} from '../../shared/types.js';

interface ChapterContextInput {
  project: StoryProject;
  actTimeline: ActTimeline;
  sceneOutline: SceneOutlineArtifact;
  memory: StoryMemoryState;
  actId: string;
  chapterId: number;
}

function collectKeywords(target: string, anchors: Array<{ text: string }>, memory: StoryMemoryState): string[] {
  const source = [
    target,
    ...anchors.map((anchor) => anchor.text),
    ...memory.foreshadowing.filter((item) => item.status === 'open').map((item) => item.text)
  ].join(' ');

  return Array.from(new Set(source.toLowerCase().match(/[a-z0-9]+/g) ?? [])).filter((word) => word.length > 3);
}

function matchHistoryFragments(memory: StoryMemoryState, keywords: string[]) {
  if (keywords.length === 0) return [];
  return memory.recentEvents
    .filter((event) => keywords.some((keyword) => event.summary.toLowerCase().includes(keyword)))
    .map((event) => ({ source: `chapter-${event.chapterId}`, text: event.summary }));
}

export function buildChapterContextPacket(input: ChapterContextInput): ChapterContextPacket {
  const actIndex = input.actTimeline.acts.findIndex((act) => act.id === input.actId);
  const currentAct = input.actTimeline.acts[actIndex];
  if (!currentAct) {
    throw new Error(`Act ${input.actId} was not found`);
  }

  const sceneAct = input.sceneOutline.acts.find((act) => act.actId === input.actId);
  const chapterOutline = sceneAct?.chapters.find((chapter) => chapter.chapterId === input.chapterId);
  if (!chapterOutline) {
    throw new Error(`Chapter ${input.chapterId} outline was not found in ${input.actId}`);
  }

  const recentChapterTexts = input.project.chapters
    .filter((chapter) => chapter.meta.id < input.chapterId)
    .sort((left, right) => left.meta.id - right.meta.id)
    .slice(-2)
    .map((chapter) => ({ id: chapter.meta.id, title: chapter.meta.title, content: chapter.content }));

  const previousActSummary = actIndex > 0 ? input.actTimeline.acts[actIndex - 1]?.summary ?? '' : '';
  const currentActSummary = sceneAct?.summary || currentAct.summary;
  const keywords = collectKeywords(chapterOutline.target, chapterOutline.anchors, input.memory);

  return {
    currentChapterTarget: chapterOutline.target,
    currentActOutline: currentAct,
    anchors: chapterOutline.anchors,
    stateMachine: {
      characterStates: input.memory.characterStates,
      foreshadowing: input.memory.foreshadowing,
      locationStates: input.memory.locationStates,
      objectStates: input.memory.objectStates,
      activeWorldRules: input.memory.activeWorldRules,
      openConflicts: input.memory.openConflicts
    },
    previousActSummary,
    currentActSummary,
    recentChapterTexts,
    matchedHistoryFragments: matchHistoryFragments(input.memory, keywords)
  };
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
npm test -- src/tests/chapterContext.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the chapter context builder**

Run:

```bash
git add src/renderer/services/chapterContext.ts src/tests/chapterContext.test.ts
git commit -m "feat: add strict chapter context builder"
```

## Task 6: Chapter Draft Workflow Foundation

**Files:**
- Create: `src/renderer/services/chapterDraftWorkflow.ts`
- Test: `src/tests/chapterDraftWorkflow.test.ts`

- [ ] **Step 1: Write the failing chapter draft workflow test**

Create `src/tests/chapterDraftWorkflow.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { ChapterContextPacket, ChapterReviewReport } from '../shared/types';
import type { StoryPlugin } from '../renderer/services/plugins/storyPluginTypes';
import { createStoryPluginRegistry } from '../renderer/services/plugins/storyPluginRegistry';
import {
  confirmDraftSave,
  forceSaveDraftAfterWarning,
  generateReviewedChapterDraft
} from '../renderer/services/chapterDraftWorkflow';

function packet(): ChapterContextPacket {
  return {
    currentChapterTarget: 'Reveal the ledger.',
    currentActOutline: { id: 'act-1', title: 'Act 1', time: 'Day 1', location: 'Archive', characters: ['Mira'], movement: 'Find ledger', summary: 'Mira finds the ledger.' },
    anchors: [],
    stateMachine: { characterStates: [], foreshadowing: [] },
    previousActSummary: '',
    currentActSummary: 'Mira finds the ledger.',
    recentChapterTexts: [],
    matchedHistoryFragments: []
  };
}

describe('chapterDraftWorkflow', () => {
  it('generates a draft and automatically reviews it', async () => {
    const plugin: StoryPlugin = {
      id: 'test-plugin',
      capabilities: {
        write_chapter: async () => ({
          chapter: {
            meta: { id: 2, title: 'Chapter 2', sceneCount: 1, characters: ['Mira'], locations: ['Archive'], timelineDay: 2 },
            content: '# Chapter 2\n\nMira reads the ledger.'
          }
        }),
        review_chapter: async (): Promise<ChapterReviewReport> => ({
          status: 'issues_found',
          summary: 'One continuity warning.',
          issues: [{ id: 'issue-1', severity: 'warning', message: 'Ledger location needs confirmation.' }]
        })
      }
    };

    const result = await generateReviewedChapterDraft(createStoryPluginRegistry([plugin]), packet());

    expect(result.status).toBe('reviewed');
    expect(result.review.issues[0].message).toContain('Ledger location');
    expect(result.saveDecision).toBe('blocked_by_review');
  });

  it('requires a second confirmation for force-save after warnings', () => {
    const first = forceSaveDraftAfterWarning({ secondConfirmation: false });
    const second = forceSaveDraftAfterWarning({ secondConfirmation: true });

    expect(first).toEqual({ allowed: false, reason: 'second_confirmation_required' });
    expect(second).toEqual({ allowed: true, reason: 'user_overrode_review' });
  });

  it('allows normal save after a passing review', () => {
    expect(confirmDraftSave({ status: 'passed', summary: 'Clean.', issues: [] })).toEqual({ allowed: true, reason: 'review_passed' });
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
npm test -- src/tests/chapterDraftWorkflow.test.ts
```

Expected: FAIL because `chapterDraftWorkflow.ts` does not exist.

- [ ] **Step 3: Add the chapter draft workflow implementation**

Create `src/renderer/services/chapterDraftWorkflow.ts`:

```ts
import type { ChapterContextPacket, ChapterReviewReport } from '../../shared/types.js';
import type { StoryPluginRegistry } from './plugins/storyPluginTypes';

export type DraftSaveDecision = 'ready_to_save' | 'blocked_by_review';

export interface ReviewedChapterDraft {
  status: 'reviewed';
  chapter: unknown;
  review: ChapterReviewReport;
  saveDecision: DraftSaveDecision;
}

export function confirmDraftSave(review: ChapterReviewReport) {
  if (review.status === 'passed') {
    return { allowed: true, reason: 'review_passed' as const };
  }
  return { allowed: false, reason: 'review_has_issues' as const };
}

export function forceSaveDraftAfterWarning(input: { secondConfirmation: boolean }) {
  if (!input.secondConfirmation) {
    return { allowed: false, reason: 'second_confirmation_required' as const };
  }
  return { allowed: true, reason: 'user_overrode_review' as const };
}

export async function generateReviewedChapterDraft(
  registry: StoryPluginRegistry,
  contextPacket: ChapterContextPacket
): Promise<ReviewedChapterDraft> {
  const draft = await registry.invoke<ChapterContextPacket, { chapter: unknown }>('write_chapter', contextPacket);
  const review = await registry.invoke('review_chapter', { contextPacket, chapter: draft.chapter });

  return {
    status: 'reviewed',
    chapter: draft.chapter,
    review,
    saveDecision: review.status === 'passed' ? 'ready_to_save' : 'blocked_by_review'
  };
}
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run:

```bash
npm test -- src/tests/chapterDraftWorkflow.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the chapter draft workflow foundation**

Run:

```bash
git add src/renderer/services/chapterDraftWorkflow.ts src/tests/chapterDraftWorkflow.test.ts
git commit -m "feat: add reviewed chapter draft workflow"
```

## Task 7: Foundation Verification

**Files:**
- Modify only files required by verification failures.

- [ ] **Step 1: Run the foundation tests together**

Run:

```bash
npm test -- src/tests/workflowContracts.test.ts src/tests/storyPluginRegistry.test.ts src/tests/builtinStoryPlugin.test.ts src/tests/workflowCore.test.ts src/tests/chapterContext.test.ts src/tests/chapterDraftWorkflow.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run the existing workflow-related tests**

Run:

```bash
npm test -- src/tests/storySkills.test.ts src/tests/storyWorkflow.test.ts src/tests/nextChapterWorkflow.test.ts src/tests/reviewAgent.test.ts src/tests/summaryService.test.ts
```

Expected: PASS. If an import path or type export changed, fix the smallest affected type or import without changing existing behavior.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit verification fixes if any were needed**

If Step 1, Step 2, or Step 3 required fixes, run:

```bash
git add src/shared/types.ts src/renderer/services src/tests
git commit -m "fix: stabilize workflow foundation"
```

If no fixes were needed, do not create an empty commit.

## Self-Review Notes

Spec coverage:

- Seven-stage workflow contracts are covered by Task 1 and Task 4.
- Built-in plugin architecture is covered by Task 2 and Task 3.
- Strict chapter context packet is covered by Task 5.
- Save versus force-save review gates are covered by Task 6.
- Compatibility with current story skills is covered by Task 3 and Task 7.
- Full redesigned UI is outside this foundation plan and should receive a separate plan after these contracts land.

Ambiguity scan:

- This plan contains concrete file paths, concrete commands, expected results, and code snippets for each implementation task.

Type consistency:

- `StoryPluginCapability`, `ChapterContextPacket`, `StoryWorkflowState`, and `StoryPluginRegistry` are introduced before dependent tasks consume them.
- `ChapterContextPacket` field names match the approved design document.
