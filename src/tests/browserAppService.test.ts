import { describe, expect, it, vi } from 'vitest';
import 'fake-indexeddb/auto';

import { createBrowserAppService } from '../renderer/services/browser/browserAppService';
import type { BrowserAiConfigStore } from '../renderer/services/browser/browserAiConfigStore';
import type { BrowserProjectStore } from '../renderer/services/browser/browserProjectStore';
import { createInitialWorkflowState } from '../renderer/services/workflowCore';
import { closeBrowserDatabase, openBrowserDatabase } from '../renderer/services/browser/browserDb';
import { createBrowserProjectStore } from '../renderer/services/browser/browserProjectStore';
import type { StoryProject } from '../shared/types';

function project(): StoryProject {
  return {
    rootPath: 'browser:test-project',
    settings: { name: 'Test project', createdAt: '2026-07-29T00:00:00.000Z', reviewStrictness: 'medium' },
    world: { genre: '', premise: '', rules: [], terms: {} },
    characters: [],
    plot: [],
    chapters: [],
    summary: { timeline: [], locations: [], characters: [] },
    workflow: createInitialWorkflowState()
  };
}

function projectStore(): BrowserProjectStore {
  return {
    create: vi.fn(), list: vi.fn(), load: vi.fn(), save: vi.fn(), remove: vi.fn(), exportProject: vi.fn(), importProject: vi.fn()
  };
}

function configStore(initial: BrowserAiConfigStore['load'] extends () => Promise<infer T> ? T : never = null): BrowserAiConfigStore {
  let current = initial;
  return {
    load: async () => current,
    save: async (config) => { current = config; },
    clear: async () => { current = null; }
  };
}

describe('browserAppService', () => {
  it('persists a confirmed workflow stage through the real browser IndexedDB store', async () => {
    const database = await openBrowserDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('projects', 'readwrite');
      transaction.objectStore('projects').clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });

    const store = createBrowserProjectStore();
    const service = createBrowserAppService({ projectStore: store, aiConfigStore: configStore() });
    const created = await service.createProject('Persisted workflow');
    const workflow = await service.createWorkflowService();
    const intake = await workflow.generateStage(created, 'intake', 'A city where memories can be traded.');
    const confirmed = workflow.confirmStage(created, 'intake', intake);

    await service.saveProject(confirmed.project);
    const reloaded = await createBrowserAppService({ projectStore: createBrowserProjectStore(), aiConfigStore: configStore() })
      .loadProject(created.rootPath);

    expect(reloaded.workflow.currentStage).toBe('world_outline');
    expect(reloaded.workflow.stages.intake.status).toBe('confirmed');
    closeBrowserDatabase();
  });

  it('uses only the mock provider and reports mock status when no configuration is present', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const service = createBrowserAppService({ projectStore: projectStore(), aiConfigStore: configStore(), fetchImpl: fetchMock });

    await expect(service.getAiStatus()).resolves.toEqual({ configured: false, provider: 'mock', model: 'mock', baseUrl: '' });
    await expect((await service.createWorkflowService()).generateStage(project(), 'intake', 'A quiet city')).resolves.toMatchObject({ genre: 'Speculative mystery' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('clears the saved API configuration and returns to the unconfigured browser status', async () => {
    const configs = configStore();
    const service = createBrowserAppService({ projectStore: projectStore(), aiConfigStore: configs });

    await service.saveAiConfig({ provider: 'openai', apiKey: 'test-key', model: 'gpt-test', baseUrl: 'https://api.example.test/v1' });
    await service.clearAiConfig();

    await expect(configs.load()).resolves.toBeNull();
    await expect(service.getAiStatus()).resolves.toEqual({ configured: false, provider: 'mock', model: 'mock', baseUrl: '' });
  });

  it('treats a configuration without an API key as mock-only', async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const service = createBrowserAppService({
      projectStore: projectStore(),
      aiConfigStore: configStore({ provider: 'openai', apiKey: '   ', model: 'gpt-test', baseUrl: 'https://api.example.test/v1' }),
      fetchImpl: fetchMock
    });

    await expect(service.getAiStatus()).resolves.toEqual({ configured: false, provider: 'mock', model: 'mock', baseUrl: '' });
    await expect((await service.createWorkflowService()).generateStage(project(), 'intake', 'A quiet city')).resolves.toMatchObject({ genre: 'Speculative mystery' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes configuration into one skill provider and sends theme generation through the browser runner', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: '{"title":"Signal City","protagonist":"Mira","conflict":"Truth","themes":["Memory"]}' } }] }), { status: 200 })
    );
    const configs = configStore();
    const service = createBrowserAppService({ projectStore: projectStore(), aiConfigStore: configs, fetchImpl: fetchMock });

    await service.saveAiConfig({ provider: 'openai', apiKey: 'test-key', model: 'gpt-test', baseUrl: 'https://api.example.test/v1/' });

    await expect(service.getAiStatus()).resolves.toEqual({
      configured: true,
      provider: 'openai',
      model: 'gpt-test',
      baseUrl: 'https://api.example.test/v1/'
    });
    await expect((await service.createWorkflowService()).generateStage(project(), 'intake', 'A city transmits memories.')).resolves.toMatchObject({ protagonist: 'Mira' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.test/v1/chat/completions', expect.any(Object));
  });

  it('does not fall back to a mock provider after a configured browser request fails', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error('network unavailable'));
    const service = createBrowserAppService({
      projectStore: projectStore(),
      aiConfigStore: configStore({ provider: 'openai', apiKey: 'test-key', model: 'gpt-test', baseUrl: 'https://api.example.test/v1' }),
      fetchImpl: fetchMock
    });

    await expect((await service.createWorkflowService()).generateStage(project(), 'intake', 'A quiet city')).rejects.toThrow(
      'Unable to reach the model endpoint. Check the network connection, Base URL, and browser CORS support.'
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('tests a configured connection with the same browser runner', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }), { status: 200 })
    );
    const service = createBrowserAppService({
      projectStore: projectStore(),
      aiConfigStore: configStore({ provider: 'deepseek', apiKey: 'test-key', model: 'deepseek-test', baseUrl: 'https://api.example.test' }),
      fetchImpl: fetchMock
    });

    await expect(service.testAiConnection()).resolves.toEqual({ ok: true, provider: 'deepseek', model: 'deepseek-test', message: 'Model connection succeeded' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.test/chat/completions');
  });
});
