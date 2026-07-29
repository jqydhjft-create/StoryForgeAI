import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  closeBrowserDatabase,
  openBrowserDatabase
} from '../renderer/services/browser/browserDb';

describe('browserDb', () => {
  afterEach(() => {
    closeBrowserDatabase();
  });

  it('opens the version-one StoryForge browser database with its required stores', async () => {
    const database = await openBrowserDatabase();

    expect(database.name).toBe('storyforge-browser');
    expect(database.version).toBe(1);
    expect(Array.from(database.objectStoreNames)).toEqual(['projects', 'settings']);

    const transaction = database.transaction(['projects', 'settings'], 'readonly');
    expect(transaction.objectStore('projects').keyPath).toBe('id');
    expect(transaction.objectStore('settings').keyPath).toBe('key');
  });

  it('caches the open database and resets the cache when closed', async () => {
    const initialDatabase = await openBrowserDatabase();

    expect(await openBrowserDatabase()).toBe(initialDatabase);

    closeBrowserDatabase();

    expect(await openBrowserDatabase()).not.toBe(initialDatabase);
  });

  it('does not let a stale pending open replace a later connection', async () => {
    const originalIndexedDb = globalThis.indexedDB;
    const requests: IDBOpenDBRequest[] = [];
    const staleDatabase = { close: vi.fn() } as unknown as IDBDatabase;
    const activeDatabase = { close: vi.fn() } as unknown as IDBDatabase;

    globalThis.indexedDB = {
      open: vi.fn(() => {
        const request = {
          result: requests.length === 0 ? staleDatabase : activeDatabase,
          onerror: null,
          onsuccess: null,
          onupgradeneeded: null
        } as unknown as IDBOpenDBRequest;
        requests.push(request);
        return request;
      })
    } as unknown as IDBFactory;

    try {
      const staleOpen = openBrowserDatabase();
      closeBrowserDatabase();
      const activeOpen = openBrowserDatabase();

      requests[1].onsuccess?.(new Event('success'));
      expect(await activeOpen).toBe(activeDatabase);

      requests[0].onsuccess?.(new Event('success'));
      expect(await staleOpen).toBe(staleDatabase);

      closeBrowserDatabase();

      expect(staleDatabase.close).toHaveBeenCalledTimes(1);
      expect(activeDatabase.close).toHaveBeenCalledTimes(1);
    } finally {
      closeBrowserDatabase();
      globalThis.indexedDB = originalIndexedDb;
    }
  });
});
