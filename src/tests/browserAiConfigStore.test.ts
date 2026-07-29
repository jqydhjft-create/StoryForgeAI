import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { closeBrowserDatabase, openBrowserDatabase } from '../renderer/services/browser/browserDb';
import { createBrowserAiConfigStore } from '../renderer/services/browser/browserAiConfigStore';
import type { AiProviderConfigInput } from '../shared/types';

const config: AiProviderConfigInput = {
  provider: 'openai',
  apiKey: 'test-api-key',
  model: 'gpt-5',
  baseUrl: 'https://api.openai.com/v1'
};

async function clearSettings(): Promise<void> {
  const database = await openBrowserDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction('settings', 'readwrite');
    transaction.objectStore('settings').clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function putSettingsRecord(value: unknown): Promise<void> {
  const database = await openBrowserDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction('settings', 'readwrite');
    transaction.objectStore('settings').put(value);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

describe('browserAiConfigStore', () => {
  beforeEach(clearSettings);

  afterEach(() => {
    closeBrowserDatabase();
  });

  it('returns null before an AI configuration has been saved', async () => {
    await expect(createBrowserAiConfigStore().load()).resolves.toBeNull();
  });

  it('saves and loads the AI configuration', async () => {
    const store = createBrowserAiConfigStore();

    await store.save(config);

    await expect(store.load()).resolves.toEqual(config);
  });

  it('overwrites the prior AI configuration', async () => {
    const store = createBrowserAiConfigStore();
    await store.save(config);
    const replacement = { ...config, provider: 'deepseek' as const, model: 'deepseek-chat' };

    await store.save(replacement);

    await expect(store.load()).resolves.toEqual(replacement);
  });

  it('clears a saved AI configuration', async () => {
    const store = createBrowserAiConfigStore();
    await store.save(config);

    await store.clear();

    await expect(store.load()).resolves.toBeNull();
  });

  it('returns null for a malformed stored record', async () => {
    await putSettingsRecord({ key: 'ai-config', value: { ...config, provider: 'mock' } });

    await expect(createBrowserAiConfigStore().load()).resolves.toBeNull();
  });

  it.each([
    [{ ...config, provider: 'mock' }],
    [{ ...config, apiKey: '   ' }],
    [{ ...config, model: '' }],
    [{ ...config, baseUrl: '  ' }]
  ])('rejects an invalid AI configuration before persisting it', async (invalidConfig) => {
    const store = createBrowserAiConfigStore();

    await expect(store.save(invalidConfig as AiProviderConfigInput)).rejects.toThrow('Invalid AI configuration');
    await expect(store.load()).resolves.toBeNull();
  });
});
