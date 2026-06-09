# StoryForge Agent Plugin Workflow Design

Date: 2026-06-09

## Purpose

StoryForge should evolve from a one-shot generation flow into a staged writing workflow that is easier to continue developing and cheaper to run with model context. The new design uses a workflow-led architecture with stage-specific agents, a small core program, replaceable plugins, and layered memory.

The goal is not to build a third-party plugin marketplace in this phase. The goal is to cut clear boundaries so generation, review, scoring, retrieval, and memory-update behavior can change without rewriting the main workflow.

## Goals

- Support a seven-stage story creation workflow from intake to optional full-text review.
- Reduce development context by isolating each stage behind explicit contracts.
- Reduce model context by constructing small task-specific context packets.
- Keep the main program responsible for user decisions, workflow state, project files, and permissioned writes.
- Move concrete generation, review, scoring, retrieval, and state-update behavior behind plugin interfaces.
- Preserve a practical migration path from the current built-in skill runner.

## Non-Goals

- Third-party plugin installation.
- Plugin marketplace features.
- Complex plugin sandboxing.
- Cloud sync.
- Full vector database integration.
- Multi-model automatic routing.
- Automatic rewriting of confirmed chapters without user approval.

## Architecture

The application is organized into five cooperating layers.

### User Layer

The user works through a natural-language chat interface and explicit workflow controls. The user can confirm, regenerate, save, force-save after warning, view scores, and request optional full-text review.

### Workflow Core

The workflow core owns:

- Current project state.
- Current workflow stage.
- Stage confirmation status.
- Project file reads and writes.
- Context packet construction.
- Plugin invocation.
- Write permissions and user confirmation gates.

The workflow core is the authority for project state. Agents and plugins may propose outputs or edits, but they do not directly commit project files.

### Agent Layer

The system uses stage-specific agents wrapped by one unified chat experience:

- `IntakeAgent` for creation intent and the initial setting book.
- `WorldOutlineAgent` for worldbuilding and the master outline.
- `TimelineAgent` for act-level timeline construction.
- `SceneOutlineAgent` for act scene outlines and user anchors.
- `ChapterWriterAgent` for chapter drafting.
- `EditorAgent` for chapter issue review, act scoring, and optional full-text review.
- `MemoryAgent` for proposed state-machine and memory updates.

A single central all-purpose agent is intentionally avoided. Stage-specific agents keep prompts smaller, tests clearer, and failures easier to isolate.

### Plugin Layer

Plugins provide replaceable capabilities. The first phase should use built-in plugins only.

Initial capability targets:

- `generate_initial_brief`
- `generate_world_and_outline`
- `generate_act_timeline`
- `generate_scene_outline`
- `write_chapter`
- `review_chapter`
- `score_act`
- `review_full_text`
- `lookup_history`
- `check_hard_rules`
- `mark_inconsistency`
- `update_state_machine`

Plugins communicate through typed input and output contracts. They cannot write project files directly.

### Memory Layer

Memory is split into long-term and short-term memory.

Long-term memory is the project document library. It stores settings, worldbuilding, outline documents, act timelines, scene outlines, anchors, chapters, summaries, state-machine snapshots, scores, and review reports.

Short-term memory is the working memory packet for the current task. It contains only the information needed for the next action, such as recent text, recent event summaries, relevant rules, and active state.

## Seven-Stage Workflow

### Stage 0: Intake

The agent asks for creation intent in sequence:

- Genre or type.
- World premise.
- Protagonist.
- Core conflict.
- Desired reader feeling.
- Approximate length.
- Other required elements.

Output: initial setting book.

User action: confirm or revise.

### Stage 1: Worldbuilding And Master Outline

Input: confirmed initial setting book.

The agent generates:

- Detailed worldbuilding document.
- Master outline document.

User action: confirm or regenerate.

### Stage 2: Act Timeline

Input: worldbuilding and master outline.

The agent generates an act-level timeline. Each act includes:

- Time.
- Location.
- Active characters.
- Major story movement.

User action: confirm or regenerate.

### Stage 3: Scene Outline

Input: confirmed act timeline.

The agent generates scene sequences by act. Each act includes a 300-500 character act summary.

The user can add anchors in the outline using this pattern:

```text
[Echo Act X Chapter Y: content]
```

User action: confirm, regenerate, or add anchors.

### Stage 4: Chapter Draft Loop

For each chapter, the workflow core builds a minimal chapter context packet and sends it to the chapter writer plugin.

The chapter draft is automatically reviewed by the editor plugin.

User action:

- Confirm and save.
- Regenerate.
- Ignore warnings and force-save after a second confirmation.

This loop continues until all planned chapters are complete.

### Stage 5: Act Scoring

After all chapters in an act are confirmed, the editor plugin scores the act automatically.

Scores use 1-10 values for:

- Plot continuity.
- Character consistency.
- Pacing control.
- Detail richness.

The score is non-blocking. The user can review it but is not required to revise.

### Stage 6: Optional Full Review

After all chapters are complete, the user can request a full-text review.

The editor plugin produces a comprehensive issue report across the full story.

## Chapter Context Packet

Stage 4 uses the strictest context budget. The chapter writer receives a `ChapterContextPacket` instead of the whole project.

Required fields:

```text
currentChapterTarget
currentActOutline
anchors
stateMachine
previousActSummary
currentActSummary
recentChapterTexts
matchedHistoryFragments
```

The packet loads:

- Current act complete outline.
- State machine containing current character state and foreshadowing list.
- Previous act summary when available.
- Current act summary when available.
- The most recent two chapter texts when available.
- Matching fragments extracted from historical act summaries.
- Current chapter target.
- User anchors relevant to the current chapter.

The packet does not load by default:

- Full worldbuilding document.
- Full master outline.
- All chapters.
- All historical events.

If additional facts are needed, the workflow core or an agent calls `lookup` against the document library and adds only relevant fragments.

## Core Tools

The architecture exposes a small set of controlled core tools:

- `lookup`: retrieve relevant document-library fragments by keyword, stage, character, act, chapter, or anchor.
- `write`: draft content from a working memory packet.
- `record`: persist confirmed content into the document library.
- `revise`: modify content at a specified project location after user confirmation.

These are stable internal operations. Plugins may implement behavior behind them, but writes still pass through the workflow core.

## Save And Review Rules

Generated chapter text is not saved automatically.

The save path is:

```text
draft chapter
-> editor review
-> user confirm
-> workflow core validates
-> record content
-> update summaries and state machine
```

If the editor reports issues, the user can regenerate or force-save. Force-save requires a second confirmation and records the ignored warning state.

## State Machine

The first required state-machine fields are:

- Character states.
- Foreshadowing list.

Optional fields may include:

- Location state.
- Object state.
- Active world rules.
- Open conflicts.

After each confirmed chapter, the memory agent proposes state-machine updates. The workflow core records accepted updates.

## Migration Strategy

The current hard-coded story skill definitions should become the first built-in plugin. Existing workflow services can be preserved temporarily through adapters while the new workflow core is introduced.

Recommended order:

1. Define shared data contracts for workflow stages, artifacts, plugins, and chapter context packets.
2. Add a built-in plugin registry.
3. Move existing story skill definitions behind built-in plugin capability contracts.
4. Implement the seven-stage workflow state model.
5. Implement the chapter context builder.
6. Replace direct UI calls to old workflow services with workflow-core stage actions.
7. Add editor review, act scoring, and optional full review as plugin-backed actions.
8. Remove obsolete one-shot workflow entry points after compatibility tests pass.

## Testing Strategy

Tests should cover:

- Stage transitions and confirmation gates.
- Regeneration behavior per stage.
- Chapter context packet construction.
- Plugin invocation contracts.
- Save versus force-save behavior.
- Editor issue reports.
- Act scoring output shape.
- State-machine update behavior.
- Backward compatibility for existing project data where practical.

## Acceptance Criteria

The first implementation phase is complete when:

- The user can progress through all seven stages.
- Each stage has explicit confirm and regenerate behavior.
- Chapter generation uses the minimal `ChapterContextPacket`.
- Generation, review, scoring, history lookup, and state updates run through plugin contracts.
- The main workflow does not depend on one specific model provider.
- Editor review happens before chapter save.
- Force-save requires a second confirmation.
- Act scoring runs automatically and does not block progress.
- Full-text review can be triggered after all chapters are complete.

