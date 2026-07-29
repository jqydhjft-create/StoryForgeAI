# StoryForge Browser PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Make StoryForge run as a local-first browser PWA with IndexedDB projects, browser-local BYOK model configuration, import/export, and no Electron runtime requirement.

**Architecture:** Preserve the React UI and unified workflow domain modules. Add small browser-only stores for projects and AI configuration, a fetch-based skill runner, and a browser application service that becomes the only dependency used by App.tsx. Electron sources remain for the desktop build but are not imported by the web entrypoint.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Vitest, fake-indexeddb, vite-plugin-pwa, IndexedDB, Fetch API.

---

## Files and boundaries

| File | Responsibility |
| --- | --- |
| src/renderer/services/browser/browserDb.ts | Opens the projects/settings IndexedDB database. |
| src/renderer/services/browser/browserProjectStore.ts | Project CRUD and JSON backup validation. |
| src/renderer/services/browser/browserAiConfigStore.ts | Local provider configuration CRUD. |
| src/renderer/services/browser/browserSkillRunner.ts | BYOK compatible chat-completions fetch client. |
| src/renderer/services/browser/browserAppService.ts | Composes browser storage, model runner and workflow service. |
| src/renderer/services/browser/browserDownloads.ts | Browser download data and Blob trigger. |
| src/renderer/services/appService.ts | App-facing interface with no Electron globals. |
| src/renderer/App.tsx | UI orchestration using AppService. |
| src/renderer/components/StartScreen.tsx | Browser project list and import action. |
| vite.config.ts and public/ | PWA manifest, icon and auto-updating service worker. |

The worktree is already dirty. Do not stage, commit, reset, checkout, delete benchmark evidence, or remove Electron source files during execution.

### Task 1: Add IndexedDB test support and database wrapper

**Files:**
- Modify: package.json and package-lock.json
- Create: src/renderer/services/browser/browserDb.ts
- Create: src/tests/browserDb.test.ts

- [ ] **Step 1: Write the failing test**

~~~ts
import 'fake-indexeddb/auto';
import { beforeEach, expect, test } from 'vitest';
import { closeBrowserDatabase, openBrowserDatabase } from '../renderer/services/browser/browserDb';

beforeEach(async () => closeBrowserDatabase());

test('opens projects and settings stores', async () => {
  const database = await openBrowserDatabase();
  expect(Array.from(database.objectStoreNames)).toEqual(['projects', 'settings']);
});
~~~

- [ ] **Step 2: Run RED**

Run: npm.cmd test -- src/tests/browserDb.test.ts

Expected: FAIL because fake-indexeddb and browserDb do not exist.

- [ ] **Step 3: Implement the minimal wrapper**

Install fake-indexeddb as a development dependency. In browserDb.ts create database storyforge-browser, version 1, with key-path stores projects keyed by id and settings keyed by key. Cache the open promise and export closeBrowserDatabase() that closes it and clears the cache.

- [ ] **Step 4: Run GREEN**

Run: npm.cmd test -- src/tests/browserDb.test.ts

Expected: PASS.

### Task 2: Implement browser project storage and safe backup import

**Files:**
- Create: src/renderer/services/browser/browserProjectStore.ts
- Create: src/tests/browserProjectStore.test.ts
- Reference: src/shared/types.ts, src/shared/workflowDefaults.ts, src/main/projectStore.ts

- [ ] **Step 1: Write failing CRUD and import tests**

~~~ts
const store = createBrowserProjectStore();
const created = await store.create('Ash Road');
expect(created.rootPath).toMatch(/^browser:/);
expect((await store.list()).map((item) => item.settings.name)).toEqual(['Ash Road']);

await store.save({ ...created, settings: { ...created.settings, name: 'Revised' } });
expect((await store.load(created.rootPath)).settings.name).toBe('Revised');

const backup = store.exportProject(created);
expect(backup).toMatchObject({ format: 'storyforge-browser-project', version: 1 });
await expect(store.importProject({ format: 'wrong', version: 1 })).rejects.toThrow('Invalid StoryForge project backup');
~~~

- [ ] **Step 2: Run RED**

Run: npm.cmd test -- src/tests/browserProjectStore.test.ts

Expected: FAIL because browserProjectStore does not exist.

- [ ] **Step 3: Implement a complete-record project store**

Export BrowserProjectBackup with format storyforge-browser-project, version 1, exportedAt, and project. Export createBrowserProjectStore with create, list, load, save, remove, exportProject, and importProject. Create the same starter project shape as projectStore.ts, using createInitialWorkflowState() and a browser rootPath produced with crypto.randomUUID(). Store id, updatedAt, project records in one transaction. Validate format/version and project containers before import; create a new browser ID before saving so invalid imports never overwrite an existing project. Do not put AI configuration in a project backup.

- [ ] **Step 4: Run GREEN**

Run: npm.cmd test -- src/tests/browserDb.test.ts src/tests/browserProjectStore.test.ts

Expected: PASS.

### Task 3: Persist browser-only AI configuration

**Files:**
- Create: src/renderer/services/browser/browserAiConfigStore.ts
- Create: src/tests/browserAiConfigStore.test.ts

- [ ] **Step 1: Write the failing configuration test**

~~~ts
import 'fake-indexeddb/auto';
import { expect, test } from 'vitest';
import { createBrowserAiConfigStore } from '../renderer/services/browser/browserAiConfigStore';

test('loads, overwrites, and clears browser-local API configuration', async () => {
  const store = createBrowserAiConfigStore();
  expect(await store.load()).toBeNull();
  await store.save({ provider: 'openai', apiKey: 'sk-test', model: 'gpt-5.6', baseUrl: 'https://api.example.test/v1' });
  expect(await store.load()).toMatchObject({ apiKey: 'sk-test' });
  await store.clear();
  expect(await store.load()).toBeNull();
});
~~~

- [ ] **Step 2: Run RED**

Run: npm.cmd test -- src/tests/browserAiConfigStore.test.ts

Expected: FAIL because the configuration store does not exist.

- [ ] **Step 3: Implement config storage**

Save a settings record named ai-config. Return null for malformed stored data. Expose load, save, and clear. Never return this record from project export functions.

- [ ] **Step 4: Run GREEN**

Run: npm.cmd test -- src/tests/browserAiConfigStore.test.ts src/tests/browserProjectStore.test.ts

Expected: PASS.

### Task 4: Add browser Skill runner with safe diagnostics

**Files:**
- Create: src/renderer/services/browser/browserSkillRunner.ts
- Create: src/tests/browserSkillRunner.test.ts
- Reference: src/main/deepSeekClient.ts and src/renderer/services/storySkills.ts

- [ ] **Step 1: Write failing runner tests**

Inject fetch into createBrowserSkillRunner. Assert a successful request targets the configured chat-completions route, uses Authorization with a test key, uses the requested model, and returns parsed JSON output. Assert malformed first output causes exactly one repair call. Assert HTTP 401 and rejected fetch never expose the key; rejected fetch must say: Unable to reach the model endpoint. Check the network connection, Base URL, and browser CORS support.

- [ ] **Step 2: Run RED**

Run: npm.cmd test -- src/tests/browserSkillRunner.test.ts

Expected: FAIL because browserSkillRunner does not exist.

- [ ] **Step 3: Implement the runner**

~~~ts
export function createBrowserSkillRunner(
  config: AiProviderConfigInput,
  fetchImpl: typeof fetch = fetch
): StorySkillRunner
~~~

Use POST JSON, Authorization, response_format json_object, current prompt/schema fields, and a normalized chat-completions URL. Parse choices[0].message.content as JSON, then try the first object-shaped substring. If parsing fails, make exactly one repair request using request.repairPrompt. Remove the API key from all error text. Do not claim a network failure reached the provider.

- [ ] **Step 4: Run GREEN**

Run: npm.cmd test -- src/tests/browserSkillRunner.test.ts

Expected: PASS.

### Task 5: Compose one whole browser provider and stable app services

**Files:**
- Create: src/renderer/services/appService.ts
- Create: src/renderer/services/browser/browserAppService.ts
- Modify: src/renderer/services/workflowService.ts
- Create: src/tests/browserAppService.test.ts

- [ ] **Step 1: Write failing service-selection tests**

Test that a browser service with no config reports mock status and exposes mock workflow behavior. Save a valid configuration and assert generateStage calls the injected fetch runner through theme-generator. Assert no registry contains both mock and real providers.

- [ ] **Step 2: Run RED**

Run: npm.cmd test -- src/tests/browserAppService.test.ts

Expected: FAIL because browserAppService does not exist.

- [ ] **Step 3: Implement service composition**

Define AppService with project CRUD/import/export, AI config load/save/clear/test, download functions and workflow-service creation. Extract a reusable workflow service factory accepting one StorySkillRunner or no runner. In browserAppService select exactly one provider: configured Keys use createSkillStoryPlugin(createBrowserSkillRunner(config)); missing Keys use createMockStoryPlugin(). Never register both providers together.

- [ ] **Step 4: Run GREEN**

Run: npm.cmd test -- src/tests/browserAppService.test.ts src/tests/workflowService.test.ts

Expected: PASS.

### Task 6: Add browser downloads, project-list UI and translated labels

**Files:**
- Create: src/renderer/services/browser/browserDownloads.ts
- Create: src/tests/browserDownloads.test.ts
- Modify: src/renderer/components/StartScreen.tsx
- Modify: src/renderer/i18n.ts
- Modify: src/tests/i18n.test.ts

- [ ] **Step 1: Write failing download and translation tests**

Assert createProjectBackupDownload returns storyforge-project.json, application/json, and text without apiKey. Assert createNovelDownload returns novel.txt and text/plain;charset=utf-8. Require i18n keys start.importProject, start.localProjects, start.deleteProject, editor.exportBackup, settings.clearApiKey, and browser.corsHint.

- [ ] **Step 2: Run RED**

Run: npm.cmd test -- src/tests/browserDownloads.test.ts src/tests/i18n.test.ts

Expected: FAIL.

- [ ] **Step 3: Implement downloads and local-project controls**

Implement Blob/object-URL download and revoke the URL after clicking a temporary anchor. Extend StartScreen with optional localProjects, onOpenLocalProject, onImportProject, and onDeleteLocalProject. Render a hidden JSON file input for import and list browser projects only when those props are supplied. Add English and Simplified Chinese strings.

- [ ] **Step 4: Run GREEN**

Run: npm.cmd test -- src/tests/browserDownloads.test.ts src/tests/i18n.test.ts

Expected: PASS.

### Task 7: Refactor App.tsx onto browser services

**Files:**
- Modify: src/renderer/App.tsx
- Modify: src/renderer/components/SettingsDiagnostics.tsx
- Modify: src/renderer/components/BenchmarkAudit.tsx
- Modify: src/renderer/services/exportService.ts
- Modify: src/tests/settingsDiagnostics.test.ts
- Modify: src/tests/workflowEntrypointGuard.test.ts

- [ ] **Step 1: Write failing browser-entrypoint tests**

Add a guard that fails when App.tsx contains window.storyforge, createDesktopSkillRunner, createDesktopWorkflowService, or workflowRealBenchmarkController. Add a component test proving browser settings contain provider setup but no benchmark controls. Add an integration test: create browser project, persist a confirmed workflow mutation, reload it and verify currentStage remains persisted.

- [ ] **Step 2: Run RED**

Run: npm.cmd test -- src/tests/settingsDiagnostics.test.ts src/tests/workflowEntrypointGuard.test.ts

Expected: FAIL because App.tsx is Electron-coupled.

- [ ] **Step 3: Replace the runtime boundary**

Construct createBrowserAppService in App.tsx. Route project create/open/save/delete, project backup import/export, novel export, configuration save/test/clear and workflow-service refresh through AppService. Save every successful project mutation as a complete browser project. Clear the Key input after saving and never display a saved Key. Remove benchmark state and render SettingsDiagnostics with showBenchmark false. Update exportService so browser mode receives generated export files rather than a filesystem preview. Preserve workflow/review handlers after changing dependencies.

- [ ] **Step 4: Run GREEN**

Run: npm.cmd test -- src/tests/settingsDiagnostics.test.ts src/tests/workflowEntrypointGuard.test.ts src/tests/workflowService.test.ts src/tests/workflowChapterLoop.test.ts

Expected: PASS.

### Task 8: Configure PWA and browser build

**Files:**
- Modify: package.json and package-lock.json
- Modify: vite.config.ts
- Create: public/manifest.webmanifest
- Create: public/storyforge-icon.svg
- Create: src/tests/webBuild.test.ts
- Modify: README.md

- [ ] **Step 1: Write failing build-config test**

Assert package.json defines dev:web, build:web and build:desktop. Assert vite.config.ts imports VitePWA and configures registerType autoUpdate plus a manifest.

- [ ] **Step 2: Run RED**

Run: npm.cmd test -- src/tests/webBuild.test.ts

Expected: FAIL.

- [ ] **Step 3: Implement PWA build configuration**

Install vite-plugin-pwa. Configure it with auto update, manifest name StoryForge AI, display standalone, start URL ./, and storyforge-icon.svg. Set dev:web to Vite, build:web to typecheck plus Vite build, retain old Electron compilation as build:desktop, and set build to build:web. Update README with browser launch, static deployment, IndexedDB backup/import, BYOK/CORS boundary, and optional legacy desktop build.

- [ ] **Step 4: Run GREEN**

Run: npm.cmd test -- src/tests/webBuild.test.ts; npm.cmd run build:web

Expected: PASS and dist contains a manifest/service worker plus no Electron executable.

### Task 9: Full verification and manual acceptance

**Files:** Verify only.

- [ ] **Step 1: Run automated checks**

~~~powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build:web
git diff --check
~~~

Expected: all commands succeed.

- [ ] **Step 2: Verify web bundle has no desktop import**

Run: rg -n "electron|node:fs|node:path|window.storyforge" dist

Expected: no matches.

- [ ] **Step 3: Manually validate the browser workflow**

Run npm.cmd run dev:web. In Chrome or Edge create a project, confirm intake, refresh and reopen it, export JSON, delete it, import the backup, configure a test endpoint, test it, clear the Key, and refresh. Confirm project/workflow data persists and the Key is not displayed, exported, logged, or included in the URL. Treat a CORS failure as a provider/browser configuration result, not proof that the model request completed.

## Plan self-review

- Spec coverage: Tasks 1–3 cover IndexedDB and local-key storage; Tasks 4–5 cover direct BYOK access and provider isolation; Tasks 6–7 cover browser UI and project lifecycle; Task 8 covers PWA/static deployment; Task 9 covers every acceptance condition.
- Placeholder scan: every task names exact files, failing test behavior, commands and implementation boundary.
- Type consistency: BrowserProjectBackup, AppService, createBrowserAppService, createBrowserSkillRunner and createBrowserProjectStore are introduced before later tasks use them.

