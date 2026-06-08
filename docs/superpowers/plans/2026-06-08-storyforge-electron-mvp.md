# StoryForge Electron MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable Electron desktop MVP for StoryForge AI that can create a local story project, generate mock starter assets, edit project files, summarize chapters, and export text.

**Architecture:** Electron main process owns local filesystem access and exposes a typed preload API. React + Vite renders the three-column workspace and calls isolated services for mock AI, summaries, and exports. Shared TypeScript contracts keep project data shapes consistent across main, renderer, and tests.

**Tech Stack:** Electron, React, Vite, TypeScript, Vitest, CSS.

---

## File Structure

- Create: `package.json` for scripts and dependencies.
- Create: `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `vitest.config.ts`.
- Create: `index.html`.
- Create: `src/main/main.ts` for the Electron main process.
- Create: `src/main/ipc.ts` for IPC handlers.
- Create: `src/main/projectStore.ts` for local project creation, loading, saving, and export writes.
- Create: `src/preload/preload.ts` for the safe renderer API.
- Create: `src/shared/types.ts` for project contracts.
- Create: `src/shared/templates.ts` for new-project default files.
- Create: `src/renderer/main.tsx` for React startup.
- Create: `src/renderer/App.tsx` for workspace orchestration.
- Create: `src/renderer/styles.css` for the desktop UI.
- Create: `src/renderer/services/mockAiService.ts` for deterministic mock generation.
- Create: `src/renderer/services/summaryService.ts` for summary data.
- Create: `src/renderer/services/exportService.ts` for export text assembly.
- Create: `src/renderer/components/StartScreen.tsx`.
- Create: `src/renderer/components/ProjectTree.tsx`.
- Create: `src/renderer/components/EditorPane.tsx`.
- Create: `src/renderer/components/AssistantPanel.tsx`.
- Create: `src/renderer/components/IdeaWizard.tsx`.
- Create: `src/tests/projectStore.test.ts`.
- Create: `src/tests/mockAiService.test.ts`.
- Create: `src/tests/summaryService.test.ts`.
- Create: `src/tests/exportService.test.ts`.

## Task 1: Repository And Tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `.gitignore`

- [ ] **Step 1: Initialize git**

Run: `git init`

Expected: command exits with code 0 and creates `.git/`.

- [ ] **Step 2: Create `.gitignore`**

Write:

```gitignore
node_modules/
dist/
dist-electron/
coverage/
.vite/
.superpowers/
*.log
```

- [ ] **Step 3: Create `package.json`**

Write:

```json
{
  "name": "storyforge-electron-mvp",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist-electron/main/main.js",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "dev:electron": "electron .",
    "build": "tsc -p tsconfig.node.json && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit && tsc -p tsconfig.node.json --noEmit"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^4.5.0",
    "electron": "^31.0.0",
    "vite": "^5.4.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`

Expected: `node_modules/` and `package-lock.json` are created. If the network is blocked, request permission to run the command with network access.

- [ ] **Step 5: Create TypeScript and Vite config**

Write `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src/renderer", "src/shared", "src/tests", "src/preload"]
}
```

Write `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist-electron",
    "rootDir": "src"
  },
  "include": ["src/main", "src/preload", "src/shared"]
}
```

Write `vite.config.ts`:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
```

Write `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/tests/**/*.test.ts']
  }
});
```

Write `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>StoryForge AI</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/renderer/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Run typecheck**

Run: `npm run typecheck`

Expected: FAIL because source files have not been created.

- [ ] **Step 7: Commit tooling**

Run:

```bash
git add .gitignore package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts vitest.config.ts index.html
git commit -m "chore: scaffold storyforge electron tooling"
```

Expected: commit succeeds.

## Task 2: Shared Contracts And Templates

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/templates.ts`

- [ ] **Step 1: Write shared contracts**

Write `src/shared/types.ts`:

```ts
export type TreeNodeKind = 'world' | 'character' | 'plot' | 'chapter' | 'export';

export interface StoryConcept {
  title: string;
  protagonist: string;
  goal: string;
  conflict: string;
  themes: string[];
}

export interface WorldBible {
  genre: string;
  premise: string;
  rules: string[];
  terms: Record<string, string>;
}

export interface CharacterProfile {
  id: string;
  name: string;
  role: string;
  motivation: string;
  flaw: string;
  arc: string;
}

export interface PlotBeat {
  id: string;
  label: string;
  summary: string;
  chapterHint: number;
}

export interface ChapterMeta {
  id: number;
  title: string;
  sceneCount: number;
  characters: string[];
  locations: string[];
  timelineDay: number;
}

export interface ProjectSettings {
  name: string;
  createdAt: string;
  reviewStrictness: 'low' | 'medium' | 'high';
}

export interface SummaryData {
  timeline: Array<{ event: string; time: string; chapter: number }>;
  locations: Array<{ name: string; firstAppearance: string; scenes: string[] }>;
  characters: Array<{ name: string; firstChapter: number; lastChapter: number; statusChange: string }>;
}

export interface StoryProject {
  rootPath: string;
  settings: ProjectSettings;
  world: WorldBible;
  characters: CharacterProfile[];
  plot: PlotBeat[];
  chapters: Array<{ meta: ChapterMeta; content: string }>;
  summary: SummaryData;
}

export interface ProjectFileWrite {
  relativePath: string;
  content: string;
}
```

- [ ] **Step 2: Write default templates**

Write `src/shared/templates.ts`:

```ts
import type { ChapterMeta, ProjectSettings, SummaryData, WorldBible } from './types';

export function createDefaultSettings(name: string): ProjectSettings {
  return {
    name,
    createdAt: new Date().toISOString(),
    reviewStrictness: 'medium'
  };
}

export function createDefaultWorld(): WorldBible {
  return {
    genre: 'Speculative fiction',
    premise: '',
    rules: [],
    terms: {}
  };
}

export function createDefaultChapterMeta(): ChapterMeta[] {
  return [
    {
      id: 1,
      title: 'Chapter 1',
      sceneCount: 1,
      characters: [],
      locations: [],
      timelineDay: 1
    }
  ];
}

export function createDefaultSummary(): SummaryData {
  return {
    timeline: [],
    locations: [],
    characters: []
  };
}

export function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 4: Commit contracts**

Run:

```bash
git add src/shared/types.ts src/shared/templates.ts
git commit -m "feat: add story project contracts"
```

Expected: commit succeeds.

## Task 3: Project Store

**Files:**
- Create: `src/main/projectStore.ts`
- Create: `src/tests/projectStore.test.ts`

- [ ] **Step 1: Write failing project store tests**

Write `src/tests/projectStore.test.ts`:

```ts
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { createProject, loadProject } from '../main/projectStore';

let cleanupPath = '';

afterEach(async () => {
  if (cleanupPath) {
    await rm(cleanupPath, { recursive: true, force: true });
    cleanupPath = '';
  }
});

describe('projectStore', () => {
  it('creates a project with required files', async () => {
    cleanupPath = await mkdtemp(join(tmpdir(), 'storyforge-'));
    const projectPath = join(cleanupPath, 'AshRoad');

    const project = await createProject(projectPath, 'Ash Road');

    expect(project.settings.name).toBe('Ash Road');
    expect(await readFile(join(projectPath, 'settings.json'), 'utf8')).toContain('Ash Road');
    expect(await readFile(join(projectPath, 'world', 'bible.json'), 'utf8')).toContain('Speculative fiction');
    expect(await readFile(join(projectPath, 'chapters', '01.md'), 'utf8')).toContain('# Chapter 1');
  });

  it('loads an existing project', async () => {
    cleanupPath = await mkdtemp(join(tmpdir(), 'storyforge-'));
    const projectPath = join(cleanupPath, 'AshRoad');
    await createProject(projectPath, 'Ash Road');

    const project = await loadProject(projectPath);

    expect(project.rootPath).toBe(projectPath);
    expect(project.chapters[0].meta.title).toBe('Chapter 1');
    expect(project.summary.timeline).toEqual([]);
  });

  it('reports corrupt JSON without replacing it', async () => {
    cleanupPath = await mkdtemp(join(tmpdir(), 'storyforge-'));
    const projectPath = join(cleanupPath, 'AshRoad');
    await createProject(projectPath, 'Ash Road');
    await writeFile(join(projectPath, 'settings.json'), '{bad json', 'utf8');

    await expect(loadProject(projectPath)).rejects.toThrow('Invalid JSON in settings.json');
    expect(await readFile(join(projectPath, 'settings.json'), 'utf8')).toBe('{bad json');
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `npm test -- src/tests/projectStore.test.ts`

Expected: FAIL with an import error for `../main/projectStore`.

- [ ] **Step 3: Implement project store**

Write `src/main/projectStore.ts`:

```ts
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  createDefaultChapterMeta,
  createDefaultSettings,
  createDefaultSummary,
  createDefaultWorld,
  formatJson
} from '../shared/templates';
import type { CharacterProfile, ChapterMeta, PlotBeat, StoryProject, SummaryData, WorldBible } from '../shared/types';

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, formatJson(value), 'utf8');
}

async function readJson<T>(projectPath: string, relativePath: string): Promise<T> {
  const absolutePath = join(projectPath, relativePath);
  const raw = await readFile(absolutePath, 'utf8');
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`Invalid JSON in ${relativePath}`);
  }
}

export async function createProject(projectPath: string, name: string): Promise<StoryProject> {
  await mkdir(join(projectPath, 'world'), { recursive: true });
  await mkdir(join(projectPath, 'characters', 'supporting'), { recursive: true });
  await mkdir(join(projectPath, 'plot'), { recursive: true });
  await mkdir(join(projectPath, 'chapters'), { recursive: true });
  await mkdir(join(projectPath, 'exports'), { recursive: true });

  const settings = createDefaultSettings(name);
  const world = createDefaultWorld();
  const chapterMeta = createDefaultChapterMeta();
  const summary = createDefaultSummary();

  await writeJson(join(projectPath, 'settings.json'), settings);
  await writeJson(join(projectPath, 'world', 'bible.json'), world);
  await writeFile(join(projectPath, 'world', 'terms.md'), '# Terms\n\n', 'utf8');
  await writeJson(join(projectPath, 'characters', 'protagonist.json'), []);
  await writeJson(join(projectPath, 'characters', 'antagonist.json'), []);
  await writeJson(join(projectPath, 'plot', 'beat_sheet.json'), []);
  await writeFile(join(projectPath, 'plot', 'outline.md'), '# Outline\n\n', 'utf8');
  await writeJson(join(projectPath, 'chapters', 'meta.json'), { chapters: chapterMeta, summaryCache: summary });
  await writeFile(join(projectPath, 'chapters', '01.md'), '# Chapter 1\n\n', 'utf8');
  await writeFile(join(projectPath, 'exports', 'summary.md'), '', 'utf8');

  return loadProject(projectPath);
}

export async function loadProject(projectPath: string): Promise<StoryProject> {
  const settings = await readJson<StoryProject['settings']>(projectPath, 'settings.json');
  const world = await readJson<WorldBible>(projectPath, 'world/bible.json');
  const protagonist = await readJson<CharacterProfile[]>(projectPath, 'characters/protagonist.json');
  const antagonist = await readJson<CharacterProfile[]>(projectPath, 'characters/antagonist.json');
  const plot = await readJson<PlotBeat[]>(projectPath, 'plot/beat_sheet.json');
  const metaFile = await readJson<{ chapters: ChapterMeta[]; summaryCache: SummaryData }>(projectPath, 'chapters/meta.json');
  const chapters = await Promise.all(
    metaFile.chapters.map(async (meta) => ({
      meta,
      content: await readFile(join(projectPath, 'chapters', `${String(meta.id).padStart(2, '0')}.md`), 'utf8')
    }))
  );

  return {
    rootPath: projectPath,
    settings,
    world,
    characters: [...protagonist, ...antagonist],
    plot,
    chapters,
    summary: metaFile.summaryCache
  };
}

export async function saveProjectFile(projectPath: string, relativePath: string, content: string): Promise<void> {
  await writeFile(join(projectPath, relativePath), content, 'utf8');
}
```

- [ ] **Step 4: Run project store tests**

Run: `npm test -- src/tests/projectStore.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit project store**

Run:

```bash
git add src/main/projectStore.ts src/tests/projectStore.test.ts
git commit -m "feat: add local project store"
```

Expected: commit succeeds.

## Task 4: Mock AI Service

**Files:**
- Create: `src/renderer/services/mockAiService.ts`
- Create: `src/tests/mockAiService.test.ts`

- [ ] **Step 1: Write failing mock AI tests**

Write `src/tests/mockAiService.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { generateStorySeed } from '../renderer/services/mockAiService';

describe('mockAiService', () => {
  it('turns an idea into editable story assets', () => {
    const result = generateStorySeed('A retired knight protects an orphan in the wasteland.');

    expect(result.concept.title).toBe('Wasteland Guardian');
    expect(result.concept.themes).toHaveLength(3);
    expect(result.world.rules[0]).toContain('scarcity');
    expect(result.characters).toHaveLength(3);
    expect(result.plot).toHaveLength(5);
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `npm test -- src/tests/mockAiService.test.ts`

Expected: FAIL with an import error for `mockAiService`.

- [ ] **Step 3: Implement mock AI service**

Write `src/renderer/services/mockAiService.ts`:

```ts
import type { CharacterProfile, PlotBeat, StoryConcept, WorldBible } from '../../shared/types';

export interface StorySeed {
  concept: StoryConcept;
  world: WorldBible;
  characters: CharacterProfile[];
  plot: PlotBeat[];
}

export function generateStorySeed(idea: string): StorySeed {
  const trimmedIdea = idea.trim();
  const premise = trimmedIdea.length > 0 ? trimmedIdea : 'A wounded guardian carries hope across a hostile world.';

  return {
    concept: {
      title: 'Wasteland Guardian',
      protagonist: 'Ash, a retired knight with a broken code of honor',
      goal: 'Protect an orphan who may cure the plague crossing the wasteland',
      conflict: 'Old rules of honor collide with survival in a ruined world',
      themes: [
        'Protection means accepting consequences, not obeying rules',
        'Hope grows where certainty has failed',
        'Sacrifice is defined by survivors as much as by the fallen'
      ]
    },
    world: {
      genre: 'Low fantasy apocalypse',
      premise,
      rules: [
        'Every settlement measures morality against scarcity',
        'The plague follows old pilgrimage roads',
        'Relics work only when their history is remembered'
      ],
      terms: {
        Ashroad: 'The broken road through quarantined kingdoms',
        Grayfall: 'The season when plague dust moves with the wind'
      }
    },
    characters: [
      {
        id: 'ash',
        name: 'Ash',
        role: 'Protagonist',
        motivation: 'Redeem a failure he refuses to name',
        flaw: 'Mistakes obedience for honor',
        arc: 'From rule-bound guard to accountable protector'
      },
      {
        id: 'milo',
        name: 'Milo',
        role: 'Orphan',
        motivation: 'Survive long enough to understand his gift',
        flaw: 'Trusts danger faster than comfort',
        arc: 'From frightened passenger to chosen witness'
      },
      {
        id: 'mutt',
        name: 'Mutt',
        role: 'Antagonist',
        motivation: 'Control the cure to rule the settlements',
        flaw: 'Sees mercy as a tactical weakness',
        arc: 'From pragmatic warlord to isolated tyrant'
      }
    ],
    plot: [
      { id: 'opening', label: 'Opening Image', summary: 'Ash finds Milo in a ruined chapel.', chapterHint: 1 },
      { id: 'call', label: 'Call To Guard', summary: 'A healer identifies Milo as the possible cure.', chapterHint: 2 },
      { id: 'midpoint', label: 'False Shelter', summary: 'A settlement offers safety in exchange for surrendering Milo.', chapterHint: 5 },
      { id: 'ordeal', label: 'Honor Breaks', summary: 'Ash violates his old code to save the child.', chapterHint: 8 },
      { id: 'finale', label: 'Road Of Witnesses', summary: 'The cure survives because the settlements choose cooperation.', chapterHint: 12 }
    ]
  };
}
```

- [ ] **Step 4: Run mock AI tests**

Run: `npm test -- src/tests/mockAiService.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit mock AI service**

Run:

```bash
git add src/renderer/services/mockAiService.ts src/tests/mockAiService.test.ts
git commit -m "feat: add mock story generation"
```

Expected: commit succeeds.

## Task 5: Summary And Export Services

**Files:**
- Create: `src/renderer/services/summaryService.ts`
- Create: `src/renderer/services/exportService.ts`
- Create: `src/tests/summaryService.test.ts`
- Create: `src/tests/exportService.test.ts`

- [ ] **Step 1: Write failing service tests**

Write `src/tests/summaryService.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildSummary } from '../renderer/services/summaryService';

describe('summaryService', () => {
  it('builds timeline, locations, and character appearances from chapters', () => {
    const summary = buildSummary([
      {
        meta: { id: 1, title: 'Chapel', sceneCount: 1, characters: ['Ash', 'Milo'], locations: ['Ruined Chapel'], timelineDay: 1 },
        content: '# Chapel\n\nAsh finds Milo at dawn.'
      }
    ]);

    expect(summary.timeline[0]).toEqual({ event: 'Chapel', time: 'Day 1', chapter: 1 });
    expect(summary.locations[0].name).toBe('Ruined Chapel');
    expect(summary.characters[0].name).toBe('Ash');
  });
});
```

Write `src/tests/exportService.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildNovelExport, buildSummaryExport } from '../renderer/services/exportService';

describe('exportService', () => {
  it('merges chapters into novel text', () => {
    const text = buildNovelExport('Ash Road', [
      { meta: { id: 1, title: 'Chapel', sceneCount: 1, characters: [], locations: [], timelineDay: 1 }, content: '# Chapel\n\nOpening.' }
    ]);

    expect(text).toContain('# Ash Road');
    expect(text).toContain('Opening.');
  });

  it('formats summary data as markdown', () => {
    const text = buildSummaryExport({
      timeline: [{ event: 'Chapel', time: 'Day 1', chapter: 1 }],
      locations: [{ name: 'Ruined Chapel', firstAppearance: 'Chapter 1', scenes: ['Chapter 1'] }],
      characters: [{ name: 'Ash', firstChapter: 1, lastChapter: 1, statusChange: 'Introduced' }]
    });

    expect(text).toContain('## Timeline');
    expect(text).toContain('| Day 1 | Chapel | 1 |');
  });
});
```

- [ ] **Step 2: Run failing tests**

Run: `npm test -- src/tests/summaryService.test.ts src/tests/exportService.test.ts`

Expected: FAIL with import errors for the two services.

- [ ] **Step 3: Implement summary service**

Write `src/renderer/services/summaryService.ts`:

```ts
import type { ChapterMeta, SummaryData } from '../../shared/types';

type ChapterInput = { meta: ChapterMeta; content: string };

export function buildSummary(chapters: ChapterInput[]): SummaryData {
  const locations = new Map<string, { name: string; firstAppearance: string; scenes: string[] }>();
  const characters = new Map<string, { name: string; firstChapter: number; lastChapter: number; statusChange: string }>();

  for (const chapter of chapters) {
    for (const location of chapter.meta.locations) {
      const existing = locations.get(location);
      const sceneLabel = `Chapter ${chapter.meta.id}`;
      if (existing) {
        existing.scenes.push(sceneLabel);
      } else {
        locations.set(location, { name: location, firstAppearance: sceneLabel, scenes: [sceneLabel] });
      }
    }

    for (const character of chapter.meta.characters) {
      const existing = characters.get(character);
      if (existing) {
        existing.lastChapter = chapter.meta.id;
      } else {
        characters.set(character, {
          name: character,
          firstChapter: chapter.meta.id,
          lastChapter: chapter.meta.id,
          statusChange: 'Introduced'
        });
      }
    }
  }

  return {
    timeline: chapters.map((chapter) => ({
      event: chapter.meta.title,
      time: `Day ${chapter.meta.timelineDay}`,
      chapter: chapter.meta.id
    })),
    locations: Array.from(locations.values()),
    characters: Array.from(characters.values())
  };
}
```

- [ ] **Step 4: Implement export service**

Write `src/renderer/services/exportService.ts`:

```ts
import type { ChapterMeta, SummaryData } from '../../shared/types';

type ChapterInput = { meta: ChapterMeta; content: string };

export function buildNovelExport(title: string, chapters: ChapterInput[]): string {
  const body = chapters
    .sort((left, right) => left.meta.id - right.meta.id)
    .map((chapter) => chapter.content.trim())
    .join('\n\n---\n\n');

  return `# ${title}\n\n${body}\n`;
}

export function buildSummaryExport(summary: SummaryData): string {
  const timelineRows = summary.timeline.map((item) => `| ${item.time} | ${item.event} | ${item.chapter} |`).join('\n');
  const locationRows = summary.locations.map((item) => `- **${item.name}**: ${item.scenes.join(', ')}`).join('\n');
  const characterRows = summary.characters
    .map((item) => `- **${item.name}**: Chapter ${item.firstChapter} to Chapter ${item.lastChapter}; ${item.statusChange}`)
    .join('\n');

  return [
    '# Story Summary',
    '',
    '## Timeline',
    '| Story Time | Event | Chapter |',
    '| --- | --- | --- |',
    timelineRows,
    '',
    '## Locations',
    locationRows,
    '',
    '## Characters',
    characterRows,
    ''
  ].join('\n');
}
```

- [ ] **Step 5: Run service tests**

Run: `npm test -- src/tests/summaryService.test.ts src/tests/exportService.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit summary and export services**

Run:

```bash
git add src/renderer/services/summaryService.ts src/renderer/services/exportService.ts src/tests/summaryService.test.ts src/tests/exportService.test.ts
git commit -m "feat: add summary and export services"
```

Expected: commit succeeds.

## Task 6: Electron Main, Preload, And IPC

**Files:**
- Create: `src/main/main.ts`
- Create: `src/main/ipc.ts`
- Create: `src/preload/preload.ts`

- [ ] **Step 1: Implement IPC handlers**

Write `src/main/ipc.ts`:

```ts
import { dialog, ipcMain } from 'electron';
import { createProject, loadProject, saveProjectFile } from './projectStore';

export function registerIpcHandlers(): void {
  ipcMain.handle('project:create', async (_event, projectPath: string, name: string) => createProject(projectPath, name));
  ipcMain.handle('project:load', async (_event, projectPath: string) => loadProject(projectPath));
  ipcMain.handle('project:saveFile', async (_event, projectPath: string, relativePath: string, content: string) =>
    saveProjectFile(projectPath, relativePath, content)
  );
  ipcMain.handle('dialog:openProject', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return result.canceled ? null : result.filePaths[0];
  });
}
```

- [ ] **Step 2: Implement preload API**

Write `src/preload/preload.ts`:

```ts
import { contextBridge, ipcRenderer } from 'electron';
import type { StoryProject } from '../shared/types';

const api = {
  createProject: (projectPath: string, name: string): Promise<StoryProject> =>
    ipcRenderer.invoke('project:create', projectPath, name),
  loadProject: (projectPath: string): Promise<StoryProject> => ipcRenderer.invoke('project:load', projectPath),
  saveProjectFile: (projectPath: string, relativePath: string, content: string): Promise<void> =>
    ipcRenderer.invoke('project:saveFile', projectPath, relativePath, content),
  openProjectDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:openProject')
};

contextBridge.exposeInMainWorld('storyforge', api);

declare global {
  interface Window {
    storyforge: typeof api;
  }
}
```

- [ ] **Step 3: Implement Electron main process**

Write `src/main/main.ts`:

```ts
import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { registerIpcHandlers } from './ipc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(join(__dirname, '../../dist/index.html'));
  }
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

- [ ] **Step 4: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit Electron shell**

Run:

```bash
git add src/main/main.ts src/main/ipc.ts src/preload/preload.ts
git commit -m "feat: add electron shell and ipc"
```

Expected: commit succeeds.

## Task 7: Renderer Workspace

**Files:**
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/renderer/components/StartScreen.tsx`
- Create: `src/renderer/components/ProjectTree.tsx`
- Create: `src/renderer/components/EditorPane.tsx`
- Create: `src/renderer/components/AssistantPanel.tsx`
- Create: `src/renderer/components/IdeaWizard.tsx`

- [ ] **Step 1: Implement React startup**

Write `src/renderer/main.tsx`:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 2: Implement start screen**

Write `src/renderer/components/StartScreen.tsx`:

```tsx
interface StartScreenProps {
  onCreateDemo: () => void;
  onOpenProject: () => void;
  error: string;
}

export function StartScreen({ onCreateDemo, onOpenProject, error }: StartScreenProps) {
  return (
    <main className="start-screen">
      <section className="start-panel">
        <p className="eyebrow">StoryForge AI</p>
        <h1>Desktop story workspace</h1>
        <div className="start-actions">
          <button onClick={onCreateDemo}>Create demo project</button>
          <button className="secondary" onClick={onOpenProject}>Open project</button>
        </div>
        {error ? <p className="error-text">{error}</p> : null}
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Implement project tree**

Write `src/renderer/components/ProjectTree.tsx`:

```tsx
import type { StoryProject, TreeNodeKind } from '../../shared/types';

export interface TreeSelection {
  kind: TreeNodeKind;
  id: string;
}

interface ProjectTreeProps {
  project: StoryProject;
  selection: TreeSelection;
  onSelect: (selection: TreeSelection) => void;
}

export function ProjectTree({ project, selection, onSelect }: ProjectTreeProps) {
  const items: TreeSelection[] = [
    { kind: 'world', id: 'bible' },
    ...project.characters.map((character) => ({ kind: 'character' as const, id: character.id })),
    { kind: 'plot', id: 'beat_sheet' },
    ...project.chapters.map((chapter) => ({ kind: 'chapter' as const, id: String(chapter.meta.id) })),
    { kind: 'export', id: 'summary' }
  ];

  return (
    <nav className="project-tree">
      <h2>{project.settings.name}</h2>
      {items.map((item) => (
        <button
          key={`${item.kind}-${item.id}`}
          className={selection.kind === item.kind && selection.id === item.id ? 'active' : ''}
          onClick={() => onSelect(item)}
        >
          <span>{item.kind}</span>
          <strong>{item.id}</strong>
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: Implement editor pane**

Write `src/renderer/components/EditorPane.tsx`:

```tsx
import type { StoryProject } from '../../shared/types';
import type { TreeSelection } from './ProjectTree';

interface EditorPaneProps {
  project: StoryProject;
  selection: TreeSelection;
}

export function EditorPane({ project, selection }: EditorPaneProps) {
  const chapter = selection.kind === 'chapter'
    ? project.chapters.find((item) => String(item.meta.id) === selection.id)
    : null;

  return (
    <section className="editor-pane">
      {selection.kind === 'world' ? (
        <>
          <h2>World Bible</h2>
          <textarea value={JSON.stringify(project.world, null, 2)} readOnly />
        </>
      ) : null}
      {selection.kind === 'character' ? (
        <>
          <h2>Character</h2>
          <textarea value={JSON.stringify(project.characters.find((item) => item.id === selection.id), null, 2)} readOnly />
        </>
      ) : null}
      {selection.kind === 'plot' ? (
        <>
          <h2>Beat Sheet</h2>
          <textarea value={JSON.stringify(project.plot, null, 2)} readOnly />
        </>
      ) : null}
      {chapter ? (
        <>
          <h2>{chapter.meta.title}</h2>
          <textarea value={chapter.content} readOnly />
        </>
      ) : null}
      {selection.kind === 'export' ? (
        <>
          <h2>Exports</h2>
          <p>Use the assistant panel to build novel and summary exports.</p>
        </>
      ) : null}
    </section>
  );
}
```

- [ ] **Step 5: Implement idea wizard**

Write `src/renderer/components/IdeaWizard.tsx`:

```tsx
import { useState } from 'react';
import { generateStorySeed } from '../services/mockAiService';
import type { StorySeed } from '../services/mockAiService';

interface IdeaWizardProps {
  onGenerated: (seed: StorySeed) => void;
}

export function IdeaWizard({ onGenerated }: IdeaWizardProps) {
  const [idea, setIdea] = useState('A retired knight protects an orphan in the wasteland.');

  return (
    <section className="idea-wizard">
      <h3>Idea to story</h3>
      <textarea value={idea} onChange={(event) => setIdea(event.target.value)} />
      <button onClick={() => onGenerated(generateStorySeed(idea))}>Generate starter assets</button>
    </section>
  );
}
```

- [ ] **Step 6: Implement assistant panel**

Write `src/renderer/components/AssistantPanel.tsx`:

```tsx
import type { StoryProject, SummaryData } from '../../shared/types';
import { buildNovelExport, buildSummaryExport } from '../services/exportService';
import { buildSummary } from '../services/summaryService';
import { IdeaWizard } from './IdeaWizard';
import type { StorySeed } from '../services/mockAiService';

interface AssistantPanelProps {
  project: StoryProject;
  summary: SummaryData;
  onSummary: (summary: SummaryData) => void;
  onSeed: (seed: StorySeed) => void;
}

export function AssistantPanel({ project, summary, onSummary, onSeed }: AssistantPanelProps) {
  const novelExport = buildNovelExport(project.settings.name, project.chapters);
  const summaryExport = buildSummaryExport(summary);

  return (
    <aside className="assistant-panel">
      <IdeaWizard onGenerated={onSeed} />
      <section>
        <h3>Review</h3>
        <p>No continuity warnings in the current mock review.</p>
      </section>
      <section>
        <h3>Summary</h3>
        <button onClick={() => onSummary(buildSummary(project.chapters))}>Refresh summary</button>
        <p>{summary.timeline.length} timeline entries</p>
        <p>{summary.locations.length} locations</p>
        <p>{summary.characters.length} characters</p>
      </section>
      <section>
        <h3>Export preview</h3>
        <textarea value={`${novelExport}\n\n${summaryExport}`} readOnly />
      </section>
    </aside>
  );
}
```

- [ ] **Step 7: Implement app orchestration**

Write `src/renderer/App.tsx`:

```tsx
import { useMemo, useState } from 'react';
import type { StoryProject, SummaryData } from '../shared/types';
import { StartScreen } from './components/StartScreen';
import { ProjectTree, type TreeSelection } from './components/ProjectTree';
import { EditorPane } from './components/EditorPane';
import { AssistantPanel } from './components/AssistantPanel';
import { generateStorySeed } from './services/mockAiService';
import type { StorySeed } from './services/mockAiService';

function createInMemoryProject(seed: StorySeed): StoryProject {
  return {
    rootPath: '',
    settings: { name: seed.concept.title, createdAt: new Date().toISOString(), reviewStrictness: 'medium' },
    world: seed.world,
    characters: seed.characters,
    plot: seed.plot,
    chapters: [
      {
        meta: { id: 1, title: 'Chapter 1', sceneCount: 1, characters: ['Ash', 'Milo'], locations: ['Ruined Chapel'], timelineDay: 1 },
        content: '# Chapter 1\n\nAsh finds Milo in a ruined chapel at dawn.'
      }
    ],
    summary: { timeline: [], locations: [], characters: [] }
  };
}

export function App() {
  const [project, setProject] = useState<StoryProject | null>(null);
  const [summary, setSummary] = useState<SummaryData>({ timeline: [], locations: [], characters: [] });
  const [selection, setSelection] = useState<TreeSelection>({ kind: 'world', id: 'bible' });
  const [error, setError] = useState('');

  const canUseDesktopApi = useMemo(() => Boolean(window.storyforge), []);

  async function openProject() {
    setError('');
    try {
      if (!canUseDesktopApi) {
        setError('Desktop API is not available in this preview.');
        return;
      }
      const path = await window.storyforge.openProjectDialog();
      if (path) {
        const loadedProject = await window.storyforge.loadProject(path);
        setProject(loadedProject);
        setSummary(loadedProject.summary);
      }
    } catch (event) {
      setError(event instanceof Error ? event.message : 'Unable to open project.');
    }
  }

  if (!project) {
    return (
      <StartScreen
        error={error}
        onOpenProject={openProject}
        onCreateDemo={() => {
          const demo = createInMemoryProject(generateStorySeed('A retired knight protects an orphan in the wasteland.'));
          setProject(demo);
        }}
      />
    );
  }

  return (
    <main className="workspace">
      <ProjectTree project={project} selection={selection} onSelect={setSelection} />
      <EditorPane project={project} selection={selection} />
      <AssistantPanel
        project={project}
        summary={summary}
        onSummary={setSummary}
        onSeed={(seed) => {
          const nextProject = createInMemoryProject(seed);
          setProject(nextProject);
          setSummary(nextProject.summary);
          setSelection({ kind: 'world', id: 'bible' });
        }}
      />
    </main>
  );
}
```

- [ ] **Step 8: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 9: Commit renderer workspace**

Run:

```bash
git add src/renderer/main.tsx src/renderer/App.tsx src/renderer/components
git commit -m "feat: add storyforge workspace UI"
```

Expected: commit succeeds.

## Task 8: Desktop Styling And Verification

**Files:**
- Create: `src/renderer/styles.css`

- [ ] **Step 1: Write desktop UI styles**

Write `src/renderer/styles.css`:

```css
:root {
  color: #1f2933;
  background: #f4f6f8;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}

button {
  border: 1px solid #c8d0d9;
  background: #ffffff;
  color: #1f2933;
  border-radius: 6px;
  padding: 8px 10px;
  font: inherit;
  cursor: pointer;
}

button:hover {
  background: #eef4f8;
}

button.secondary {
  background: #f7f9fb;
}

.start-screen {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.start-panel {
  width: min(520px, 100%);
  border: 1px solid #d6dde5;
  background: #ffffff;
  border-radius: 8px;
  padding: 28px;
}

.eyebrow {
  color: #4d6b7c;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0;
}

.start-panel h1 {
  margin: 0 0 20px;
  font-size: 28px;
}

.start-actions {
  display: flex;
  gap: 10px;
}

.error-text {
  color: #a33a3a;
}

.workspace {
  height: 100vh;
  display: grid;
  grid-template-columns: 260px minmax(420px, 1fr) 340px;
  background: #f4f6f8;
}

.project-tree,
.assistant-panel {
  overflow: auto;
  padding: 16px;
  background: #ffffff;
  border-right: 1px solid #d6dde5;
}

.assistant-panel {
  border-right: 0;
  border-left: 1px solid #d6dde5;
}

.project-tree h2,
.editor-pane h2,
.assistant-panel h3 {
  margin-top: 0;
}

.project-tree button {
  width: 100%;
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 8px;
  text-align: left;
  margin-bottom: 8px;
}

.project-tree button.active {
  border-color: #2f6f8f;
  background: #e9f4f8;
}

.project-tree span {
  color: #60717d;
  font-size: 12px;
  text-transform: uppercase;
}

.editor-pane {
  overflow: auto;
  padding: 18px;
}

.editor-pane textarea,
.assistant-panel textarea,
.idea-wizard textarea {
  width: 100%;
  min-height: 180px;
  resize: vertical;
  border: 1px solid #c8d0d9;
  border-radius: 6px;
  padding: 12px;
  font: 14px/1.5 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
  background: #ffffff;
  color: #1f2933;
}

.editor-pane textarea {
  min-height: calc(100vh - 110px);
}

.assistant-panel section {
  border-bottom: 1px solid #e1e6eb;
  padding-bottom: 14px;
  margin-bottom: 14px;
}
```

- [ ] **Step 2: Run all tests**

Run: `npm test`

Expected: PASS.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 4: Build app**

Run: `npm run build`

Expected: PASS and creates `dist/` plus `dist-electron/`.

- [ ] **Step 5: Start renderer dev server**

Run: `npm run dev`

Expected: Vite prints a local URL such as `http://127.0.0.1:5173/`.

- [ ] **Step 6: Open local URL in the in-app browser**

Use the Browser plugin to open the Vite URL.

Expected: start screen is visible with "StoryForge AI", "Create demo project", and "Open project".

- [ ] **Step 7: Verify demo workspace**

Click "Create demo project".

Expected: three-column workspace appears. Left project tree shows world, characters, plot, chapter, and export. Middle editor shows selected content. Right assistant panel shows idea wizard, review, summary, and export preview.

- [ ] **Step 8: Commit styled verified app**

Run:

```bash
git add src/renderer/styles.css
git commit -m "style: finish desktop workspace layout"
```

Expected: commit succeeds.

## Task 9: Final Review

**Files:**
- Modify only files required by verification failures.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm test
npm run typecheck
npm run build
```

Expected: all commands pass.

- [ ] **Step 2: Check git status**

Run: `git status --short`

Expected: clean working tree.

- [ ] **Step 3: Summarize implementation**

Prepare a final note with:

- Desktop app features implemented.
- Verification commands and results.
- Local URL used for browser verification.
- Any dependency or Electron runtime caveat encountered.
