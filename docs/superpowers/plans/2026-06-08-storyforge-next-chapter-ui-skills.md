# StoryForge Next Chapter UI Skills Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the writing loop by adding a tested next-chapter pipeline, better assistant workspace organization, and richer skill contracts.

**Architecture:** Keep generation logic in renderer services, project file writes in project mutation helpers, and UI orchestration in `App` plus assistant components. Skill prompts gain schema, repair, and example metadata without changing the desktop IPC boundary.

**Tech Stack:** Electron, React, Vite, TypeScript, Vitest, CSS.

---

### Task 1: Skill Contracts

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/renderer/services/storySkills.ts`
- Test: `src/tests/storySkills.test.ts`

- [ ] Write failing tests that require skill requests to include output schema, repair prompt, and examples.
- [ ] Extend `StorySkillRequest` and each story skill definition with the tested metadata.
- [ ] Run the focused skill tests.

### Task 2: Next Chapter Pipeline

**Files:**
- Create: `src/renderer/services/nextChapterWorkflow.ts`
- Modify: `src/renderer/services/projectMutations.ts`
- Test: `src/tests/nextChapterWorkflow.test.ts`
- Test: `src/tests/projectMutations.test.ts`

- [ ] Write failing tests for context packet construction and next chapter generation.
- [ ] Write failing tests for applying a generated next chapter to project state and file writes.
- [ ] Implement the minimal context packet, skill fallback, and project mutation code.
- [ ] Run the focused workflow and mutation tests.

### Task 3: Workspace UI

**Files:**
- Modify: `src/renderer/i18n.ts`
- Modify: `src/renderer/App.tsx`
- Modify: `src/renderer/components/AssistantPanel.tsx`
- Modify: `src/renderer/styles.css`
- Test: `src/tests/i18n.test.ts`

- [ ] Write failing i18n tests for tab labels and next-chapter controls.
- [ ] Add assistant tabs and next-chapter action wiring.
- [ ] Adjust CSS for write-first layout, collapsible assistant, and tabbed panels.
- [ ] Run typecheck to verify the React changes.

### Task 4: Verification

**Files:**
- Modify only files required by verification failures.

- [ ] Run all Vitest tests.
- [ ] Run renderer and node TypeScript checks.
- [ ] Run Vite build.
- [ ] Summarize exact verification results.
