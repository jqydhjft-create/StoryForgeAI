/* @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App, type AppProps } from '../renderer/App';
import type { AppService } from '../renderer/services/appService';
import { createInitialWorkflowState } from '../renderer/services/workflowCore';
import type { StoryProject } from '../shared/types';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function project(): StoryProject {
  return {
    rootPath: 'browser:app-settings',
    settings: { name: 'Browser settings', createdAt: '2026-07-29T00:00:00.000Z', reviewStrictness: 'medium' },
    world: { genre: '', premise: '', rules: [], terms: {} },
    characters: [],
    plot: [],
    chapters: [],
    summary: { timeline: [], locations: [], characters: [] },
    workflow: createInitialWorkflowState()
  };
}

function appService(): AppService {
  return {
    projectStore: {} as AppService['projectStore'],
    createProject: vi.fn().mockResolvedValue(project()),
    listProjects: vi.fn().mockResolvedValue([]),
    loadProject: vi.fn(), saveProject: vi.fn(), removeProject: vi.fn(), exportProject: vi.fn(), importProject: vi.fn(),
    loadAiConfig: vi.fn().mockResolvedValue(null), saveAiConfig: vi.fn(), clearAiConfig: vi.fn().mockResolvedValue(undefined),
    getAiStatus: vi.fn().mockResolvedValue({ configured: false, provider: 'mock', model: 'mock', baseUrl: '' }),
    testAiConnection: vi.fn(), createWorkflowService: vi.fn()
  };
}

describe('App browser API-key boundary', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(async () => {
    await act(async () => root?.unmount());
    container?.remove();
    root = undefined;
    container = undefined;
  });

  it('clears the live password input through the App-bound clear API-key handler', async () => {
    const service = appService();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);

    await act(async () => {
      root?.render(createElement<AppProps>(App, { appService: service }));
      await Promise.resolve();
      await Promise.resolve();
    });
    const createProject = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Create project');
    await act(async () => {
      createProject?.click();
      await Promise.resolve();
      await Promise.resolve();
    });

    const configToggle = container.querySelector<HTMLButtonElement>('.starter-config-toggle');
    await act(async () => configToggle?.click());

    const password = container.querySelector<HTMLInputElement>('.story-starter input[type="password"]');
    const clear = container.querySelector<HTMLButtonElement>('[data-action="clear-api-key"]');
    expect(password).not.toBeNull();
    expect(clear).not.toBeNull();

    await act(async () => {
      Simulate.change(password!, { target: { value: 'browser-secret' } } as never);
    });
    expect(password!.value).toBe('browser-secret');

    await act(async () => clear?.click());

    expect(service.clearAiConfig).toHaveBeenCalledOnce();
    expect(password!.value).toBe('');
  });
});
