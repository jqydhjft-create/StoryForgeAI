// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StartScreen } from '../renderer/components/StartScreen';
import { createNovelDownload, createProjectBackupDownload, triggerBrowserDownload } from '../renderer/services/browser/browserDownloads';
import { t, type Language } from '../renderer/i18n';
import type { StoryProject } from '../shared/types';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('browser downloads', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('creates a JSON project backup without API keys', () => {
    const download = createProjectBackupDownload({
      format: 'storyforge-browser-project',
      project: { settings: { apiKey: 'top-secret', name: 'Ash Road' } },
      apiKey: 'also-secret'
    });

    expect(download.filename).toBe('storyforge-project.json');
    expect(download.mimeType).toBe('application/json');
    expect(download.text).not.toContain('apiKey');
    expect(JSON.parse(download.text)).toMatchObject({ project: { settings: { name: 'Ash Road' } } });
  });

  it('creates a plain-text novel download from project chapters', () => {
    const project = {
      settings: { name: 'Ash Road' },
      chapters: [{ meta: { id: 1, title: 'Chapel' }, content: '# Chapel\n\nOpening.' }]
    } as StoryProject;

    const download = createNovelDownload(project);

    expect(download.filename).toBe('novel.txt');
    expect(download.mimeType).toBe('text/plain;charset=utf-8');
    expect(download.text).toContain('# Ash Road');
    expect(download.text).toContain('Opening.');
  });

  it('triggers a temporary browser download and revokes its object URL', () => {
    vi.useFakeTimers();
    const click = vi.fn();
    const remove = vi.fn();
    const anchor = { href: '', download: '', hidden: false, click, remove };
    const append = vi.fn();
    const createObjectURL = vi.fn(() => 'blob:storyforge-download');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('document', { createElement: vi.fn(() => anchor), body: { append } });
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL });

    triggerBrowserDownload({ filename: 'novel.txt', mimeType: 'text/plain;charset=utf-8', text: 'Opening.' });

    expect(anchor.download).toBe('novel.txt');
    expect(click).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledOnce();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:storyforge-download');
  });
});

describe('StartScreen browser project controls', () => {
  const baseProps: { language: Language; onLanguageChange: (language: Language) => void; projectName: string; onProjectNameChange: (name: string) => void; storyIdea: string; onStoryIdeaChange: (idea: string) => void; onCreateProject: () => void; onOpenProject?: () => void; error: string } = {
    language: 'en',
    onLanguageChange: vi.fn(),
    projectName: '',
    onProjectNameChange: vi.fn(),
    storyIdea: '',
    onStoryIdeaChange: vi.fn(),
    onCreateProject: vi.fn(),
    onOpenProject: vi.fn(),
    error: ''
  };
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  async function renderInteractive(overrides: Partial<typeof baseProps & {
    localProjects: StoryProject[];
    onOpenLocalProject: (rootPath: string) => void;
    onImportProject: (file: File) => void | Promise<void>;
    onDeleteLocalProject: (rootPath: string) => void | Promise<void>;
  }> = {}) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(createElement(StartScreen, { ...baseProps, ...overrides }));
    });
    return container;
  }

  afterEach(async () => {
    if (root) {
      await act(async () => root?.unmount());
    }
    container?.remove();
    root = undefined;
    container = undefined;
  });

  it('keeps legacy start screens unchanged when browser props are omitted', () => {
    const html = renderToStaticMarkup(createElement(StartScreen, baseProps));

    expect(html).not.toContain('Local projects');
    expect(html).not.toContain('Import project');
    expect(html).not.toContain('Delete project');
  });

  it('does not render a native folder-opening control', () => {
    const html = renderToStaticMarkup(createElement(StartScreen, baseProps));

    expect(html).not.toContain('Open project');
  });

  it('renders local-project actions only when browser props are supplied', () => {
    const localProject = { rootPath: 'browser:ash-road', settings: { name: 'Ash Road' } } as StoryProject;
    const html = renderToStaticMarkup(createElement(StartScreen, {
      ...baseProps,
      localProjects: [localProject],
      onOpenLocalProject: vi.fn(),
      onImportProject: vi.fn(),
      onDeleteLocalProject: vi.fn()
    }));

    expect(html).toContain('Local projects');
    expect(html).toContain('Ash Road');
    expect(html).toContain('Import project');
    expect(html).toContain('Delete project');
    expect(html).toContain('type="file"');
    expect(html).toContain('<button type="button"');
    expect(html).toContain('Import project</button>');
  });

  it('exposes parent and local import errors as alerts', () => {
    const html = renderToStaticMarkup(createElement(StartScreen, { ...baseProps, error: 'Import failed' }));

    expect(html).toContain('role="alert"');
    expect(html).toContain('Import failed');
  });

  it('does not delete a local project until its localized confirmation is accepted', async () => {
    const onDeleteLocalProject = vi.fn();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
    const localProject = { rootPath: 'browser:ash-road', settings: { name: 'Ash Road' } } as StoryProject;
    const screen = await renderInteractive({
      language: 'zh-CN',
      localProjects: [localProject],
      onDeleteLocalProject
    });
    const deleteButton = Array.from(screen.querySelectorAll('button')).find((button) => button.textContent === t('zh-CN', 'start.deleteProject'));

    await act(async () => deleteButton?.click());
    expect(confirm).toHaveBeenLastCalledWith(t('zh-CN', 'start.confirmDeleteProject'));
    expect(onDeleteLocalProject).not.toHaveBeenCalled();

    await act(async () => deleteButton?.click());
    expect(onDeleteLocalProject).toHaveBeenCalledWith('browser:ash-road');
  });

  it.each([
    ['a synchronous throw', () => { throw new Error('delete failed'); }],
    ['an async rejection', () => Promise.reject(new Error('delete failed'))]
  ])('shows a localized alert when deletion fails with %s', async (_case, onDeleteLocalProject) => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const localProject = { rootPath: 'browser:ash-road', settings: { name: 'Ash Road' } } as StoryProject;
    const screen = await renderInteractive({ localProjects: [localProject], onDeleteLocalProject });
    const deleteButton = Array.from(screen.querySelectorAll('button')).find((button) => button.textContent === 'Delete project');

    await act(async () => deleteButton?.click());

    expect(screen.querySelector('[role="alert"]')?.textContent).toBe(t('en', 'start.deleteProjectFailed'));
  });

  it('clears a prior deletion alert when a later confirmed deletion succeeds', async () => {
    const onDeleteLocalProject = vi.fn().mockRejectedValueOnce(new Error('delete failed')).mockResolvedValueOnce(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const localProject = { rootPath: 'browser:ash-road', settings: { name: 'Ash Road' } } as StoryProject;
    const screen = await renderInteractive({ localProjects: [localProject], onDeleteLocalProject });
    const deleteButton = Array.from(screen.querySelectorAll('button')).find((button) => button.textContent === 'Delete project');

    await act(async () => deleteButton?.click());
    expect(screen.querySelector('[role="alert"]')?.textContent).toBe(t('en', 'start.deleteProjectFailed'));

    await act(async () => deleteButton?.click());
    expect(onDeleteLocalProject).toHaveBeenCalledTimes(2);
    expect(screen.querySelector('[role="alert"]')).toBeNull();
  });

  it('disables a local project delete control while its confirmed deletion is pending', async () => {
    let settleDelete: (() => void) | undefined;
    const onDeleteLocalProject = vi.fn(() => new Promise<void>((resolve) => { settleDelete = resolve; }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const localProject = { rootPath: 'browser:ash-road', settings: { name: 'Ash Road' } } as StoryProject;
    const screen = await renderInteractive({ localProjects: [localProject], onDeleteLocalProject });
    const deleteButton = Array.from(screen.querySelectorAll('button')).find((button) => button.textContent === 'Delete project') as HTMLButtonElement;

    await act(async () => {
      deleteButton.click();
      deleteButton.click();
    });
    expect(onDeleteLocalProject).toHaveBeenCalledOnce();
    expect(deleteButton.disabled).toBe(true);

    await act(async () => settleDelete?.());
    expect(deleteButton.disabled).toBe(false);
  });

  it.each(['Enter', ' '] as const)('opens the import picker exactly once for the native %s activation sequence', async (key) => {
    const screen = await renderInteractive({ onImportProject: vi.fn() });
    const importButton = Array.from(screen.querySelectorAll('button')).find((button) => button.textContent === 'Import project');
    const input = screen.querySelector('input[type="file"]') as HTMLInputElement;
    const click = vi.spyOn(input, 'click');

    importButton?.focus();
    expect(document.activeElement).toBe(importButton);
    await act(async () => importButton?.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
    await act(async () => importButton?.click());

    expect(click).toHaveBeenCalledOnce();
  });

  it('shows a localized alert, resets the input, and permits retrying the same import after rejection', async () => {
    const file = new File(['{}'], 'storyforge-project.json', { type: 'application/json' });
    const onImportProject = vi.fn().mockRejectedValueOnce(new Error('invalid backup')).mockResolvedValueOnce(undefined);
    const screen = await renderInteractive({ onImportProject });
    const input = screen.querySelector('input[type="file"]') as HTMLInputElement;
    let value = 'selected';
    Object.defineProperty(input, 'value', { configurable: true, get: () => value, set: (next) => { value = next; } });
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });

    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
    expect(screen.querySelector('[role="alert"]')?.textContent).toBe(t('en', 'start.importProjectFailed'));
    expect(value).toBe('');
    expect(onImportProject).toHaveBeenCalledTimes(1);

    value = 'selected-again';
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
    expect(onImportProject).toHaveBeenCalledTimes(2);
    expect(value).toBe('');
    expect(screen.querySelector('[role="alert"]')).toBeNull();
  });
});
