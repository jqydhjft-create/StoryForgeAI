import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

function builtJavaScript(relativePath = 'dist'): string {
  return readdirSync(resolve(process.cwd(), relativePath)).flatMap((entry) => {
    const childPath = `${relativePath}/${entry}`;
    return statSync(resolve(process.cwd(), childPath)).isDirectory()
      ? [builtJavaScript(childPath)]
      : childPath.endsWith('.js')
        ? [source(childPath)]
        : [];
  }).join('\n');
}

describe('workflow entrypoint guard', () => {
  it('routes new creation through the unified workflow service', () => {
    const app = source('src/renderer/App.tsx');
    const service = source('src/renderer/services/workflowService.ts');

    expect(app).not.toContain("from './services/storyWorkflow'");
    expect(app).not.toContain('runStoryWorkflow(');
    expect(app).not.toContain('applyStoryWorkflowToProject(');
    expect(app).not.toContain("from './services/nextChapterWorkflow'");
    expect(app).not.toContain('createNextChapter(project)');
    expect(app).toContain('workflowService.generateStage(');
    expect(app).toContain('workflowService.generateChapter(');
    expect(service).not.toContain('createSkillStoryPlugin(runner), createMockStoryPlugin()');
  });

  it('keeps the browser renderer free of native-only entrypoints', () => {
    const app = source('src/renderer/App.tsx');

    for (const forbidden of [
      'window.storyforge',
      'createDesktopSkillRunner',
      'createDesktopWorkflowService',
      'workflowRealBenchmarkController'
    ]) {
      expect(app).not.toContain(forbidden);
    }
    expect(app).toContain('createBrowserAppService');
    expect(app).not.toContain('onOpenProject={() => undefined}');
  });

  it('keeps browser workflow dependencies free of the desktop bridge', () => {
    const browserAppService = source('src/renderer/services/browser/browserAppService.ts');
    const workflowService = source('src/renderer/services/workflowService.ts');
    const skillPlugin = source('src/renderer/services/plugins/skillStoryPlugin.ts');
    for (const moduleSource of [browserAppService, workflowService, skillPlugin]) {
      expect(moduleSource).not.toContain('window.storyforge');
      expect(moduleSource).not.toContain('createDesktopSkillRunner');
    }

    expect(skillPlugin).toContain("from '../storySkillContracts'");
    expect(skillPlugin).not.toContain("from '../storySkills'");
  });

  it('does not emit desktop-only APIs into the web build', () => {
    const bundle = builtJavaScript();

    for (const forbidden of ['window.storyforge', 'node:fs', 'node:path', 'electron']) {
      expect(bundle).not.toContain(forbidden);
    }
  });
});
