# StoryForge AI Electron MVP Design

Date: 2026-06-08

## Purpose

StoryForge AI is a desktop story creation workspace for independent writers, screenwriters, novelists, and content teams. The MVP turns a short story idea into structured project assets, lets the user edit those assets in a three-column desktop workspace, and produces summaries and exports from local project files.

This design intentionally preserves the long-term architecture from the referenced HTML document while narrowing the first implementation to a runnable Electron MVP.

## MVP Scope

The first version will implement:

- Electron desktop shell with React + Vite renderer.
- Local project creation and loading.
- Local file storage using JSON and Markdown files.
- Three-column workspace: project tree, editor, assistant panel.
- Mock AI service for idea expansion, worldbuilding, theme options, character seeds, plot beats, review notes, and summaries.
- Export to Markdown or TXT.

The first version will not implement:

- Real model API calls.
- PDF or Fountain export.
- Full version history.
- Cloud sync.
- Shot prompt generation.

Those features should be possible to add without changing the main UI or project file contracts.

## Technology

Use Electron + React + Vite.

The Electron main process owns local filesystem access. The React renderer displays and edits project state through a typed preload API. The app should avoid direct filesystem access from renderer code.

Initial libraries:

- Electron for desktop shell.
- React for UI.
- Vite for development and bundling.
- TypeScript for project contracts.
- A small local store layer built around project files.

Tailwind can be used if scaffolding is straightforward, but the UI may also start with plain CSS modules or app CSS if that keeps the first iteration lean.

## Architecture

Main process:

- Creates the application window.
- Handles project directory selection and project creation.
- Reads and writes project files.
- Exposes safe IPC methods through preload.

Preload:

- Provides a narrow `window.storyforge` API.
- Bridges renderer calls to main process IPC.
- Validates basic argument shapes before IPC calls where practical.

Renderer:

- Holds current UI selection and editing state.
- Requests project data from the preload API.
- Saves changes through explicit commands.
- Calls the mock AI service from the renderer for MVP generation flows.

Services:

- `projectStore`: load, create, update, and export project files.
- `mockAiService`: deterministic mock content generation.
- `summaryService`: build timeline, location, and character summary data from chapters and metadata.
- `exportService`: merge chapters and summaries into export files.

## Project File Structure

Each StoryForge project is a folder with this structure:

```text
Project/
  world/
    bible.json
    terms.md
  characters/
    protagonist.json
    antagonist.json
    supporting/
  plot/
    beat_sheet.json
    outline.md
  chapters/
    01.md
    meta.json
  exports/
    summary.md
    novel.txt
  settings.json
```

Missing files should be created from templates when a new project is made. When opening an existing project, missing optional files should be recreated with empty defaults. Corrupt JSON should not be overwritten automatically.

## User Experience

The first screen is the working application, not a marketing page.

If no project is open, show a compact start state with:

- Create project.
- Open project.
- Recent projects if available later.

When a project is open:

- Left column: project tree for world, characters, plot, chapters, and exports.
- Middle column: editor for the selected file or workflow step.
- Right column: assistant panel with generation actions, review notes, summary cards, and export actions.

The UI should feel like a practical writing tool: dense enough for repeated work, calm, and easy to scan. Avoid large hero sections, decorative card stacks, and marketing-style copy.

## Idea-To-Story Flow

The MVP wizard will cover:

1. User enters a one-sentence idea or rough draft.
2. Mock AI expands it into a concept card.
3. Mock AI suggests worldbuilding rules.
4. Mock AI suggests three to five theme statements.
5. Mock AI suggests protagonist, antagonist, and supporting roles.
6. Mock AI creates a beat sheet and initial chapter outline.
7. User can accept generated assets into the project files.

Each step should produce editable data before it is committed to the project.

## Summary Flow

The summary panel will produce:

- Timeline entries.
- Location appearances.
- Character appearances and status changes.

For the MVP, summary generation can combine chapter metadata with simple text heuristics and mock defaults. The data shape should match the future LLM output contract:

```json
{
  "timeline": [{ "event": "Event description", "time": "Story time", "chapter": 1 }],
  "locations": [{ "name": "Location", "firstAppearance": "1.1", "scenes": ["1.1"] }],
  "characters": [{ "name": "Character", "firstChapter": 1, "lastChapter": 10, "statusChange": "A to B" }]
}
```

## Error Handling

- Project creation failure: show the target path and a concise reason.
- Project open failure: show whether the folder is missing required files or cannot be read.
- Corrupt JSON: preserve the original file, show an error, and offer to create a repaired copy only after user confirmation.
- Save failure: keep unsaved editor state and show retry.
- Export failure: show the failed output path and reason.

## Testing

Initial test coverage should focus on behavior with project files:

- Creates a new project with required folders and files.
- Loads valid project data.
- Detects corrupt JSON without overwriting it.
- Generates mock idea-to-story assets with expected shapes.
- Generates summary data with expected shapes.
- Exports chapter text and summary content.

Renderer smoke checks should verify:

- App opens to start state.
- Project workspace shows three columns after a project is loaded.
- Key actions do not crash with default project data.

## Implementation Notes

Start with a small runnable Electron app. Keep the mock AI service isolated behind an interface so that a real provider can later implement the same methods. Keep project data contracts in shared TypeScript types so the main process, renderer, and tests use the same shapes.

The first implementation milestone is not feature completeness across the full original design. It is a stable local desktop loop: create project, generate starter assets, edit project assets, summarize, and export.
