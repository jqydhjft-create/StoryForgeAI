import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('workspace UI noise guard', () => {
  it('keeps legacy generation controls out of the editor', () => {
    expect(source('src/renderer/components/EditorPane.tsx')).not.toMatch(/regenerateChapter|rollbackChapter|onRegenerateChapter/);
  });

  it('does not import AssistantPanel into the workspace application', () => {
    expect(source('src/renderer/App.tsx')).not.toMatch(/import\s+\{\s*AssistantPanel\s*\}\s+from/);
  });

  it('renders settings diagnostics as a separate view without clearing project state', () => {
    const app = source('src/renderer/App.tsx');

    expect(app).toContain("import { SettingsDiagnostics } from './components/SettingsDiagnostics'");
    expect(app).toContain('const [settingsOpen, setSettingsOpen] = useState(false);');
    expect(app).toMatch(/if \(settingsOpen\)\s*\{[\s\S]*?<SettingsDiagnostics[\s\S]*?onBack=\{\(\) => setSettingsOpen\(false\)\}/);
    expect(app).not.toMatch(/setProject\(null\).*setSettingsOpen|setSettingsOpen.*setProject\(null\)/);
  });

  it('keeps browser diagnostics free of benchmark and Electron entrypoints', () => {
    const app = source('src/renderer/App.tsx');
    const settingsIndex = app.indexOf('<SettingsDiagnostics');

    expect(settingsIndex).toBeGreaterThanOrEqual(0);
    expect(app.slice(settingsIndex)).toContain('showBenchmark={false}');
    expect(app).not.toMatch(/onRunRealBenchmark|onRetryFailedBenchmark|workflowRealBenchmarkController/);
    expect(app).not.toMatch(/window\.storyforge|createDesktopSkillRunner|createDesktopWorkflowService/);
  });

  it('does not reset layout preferences when loading a project', () => {
    const app = source('src/renderer/App.tsx');
    const createProject = app.slice(app.indexOf('async function createLocalProject'), app.indexOf('async function openProject'));
    const openProject = app.slice(app.indexOf('async function openProject'), app.indexOf('async function saveActiveDocument'));

    expect(createProject).not.toContain('setAssetListCollapsed(');
    expect(createProject).not.toContain('setContextRailExpanded(');
    expect(openProject).not.toContain('setAssetListCollapsed(');
    expect(openProject).not.toContain('setContextRailExpanded(');
  });
});
