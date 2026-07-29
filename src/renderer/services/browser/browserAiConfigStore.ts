import type { AiProviderConfigInput } from '../../../shared/types.js';
import { openBrowserDatabase } from './browserDb.js';

const AI_CONFIG_KEY = 'ai-config';

interface BrowserAiConfigRecord {
  key: typeof AI_CONFIG_KEY;
  value: AiProviderConfigInput;
}

export interface BrowserAiConfigStore {
  load(): Promise<AiProviderConfigInput | null>;
  save(input: AiProviderConfigInput): Promise<void>;
  clear(): Promise<void>;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function isAiProviderConfig(value: unknown): value is AiProviderConfigInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const config = value as Record<string, unknown>;
  return (
    (config.provider === 'openai' || config.provider === 'deepseek') &&
    typeof config.apiKey === 'string' && config.apiKey.trim().length > 0 &&
    typeof config.model === 'string' && config.model.trim().length > 0 &&
    typeof config.baseUrl === 'string' && config.baseUrl.trim().length > 0
  );
}

export function createBrowserAiConfigStore(): BrowserAiConfigStore {
  return {
    async load(): Promise<AiProviderConfigInput | null> {
      const database = await openBrowserDatabase();
      const transaction = database.transaction('settings', 'readonly');
      const record = await requestResult(transaction.objectStore('settings').get(AI_CONFIG_KEY)) as unknown;
      await transactionDone(transaction);

      if (
        typeof record !== 'object' ||
        record === null ||
        Array.isArray(record) ||
        (record as Record<string, unknown>).key !== AI_CONFIG_KEY ||
        !isAiProviderConfig((record as Record<string, unknown>).value)
      ) {
        return null;
      }

      const config = (record as BrowserAiConfigRecord).value;
      return { provider: config.provider, apiKey: config.apiKey, model: config.model, baseUrl: config.baseUrl };
    },

    async save(input: AiProviderConfigInput): Promise<void> {
      if (!isAiProviderConfig(input)) throw new Error('Invalid AI configuration');

      const database = await openBrowserDatabase();
      const transaction = database.transaction('settings', 'readwrite');
      transaction.objectStore('settings').put({
        key: AI_CONFIG_KEY,
        value: { provider: input.provider, apiKey: input.apiKey, model: input.model, baseUrl: input.baseUrl }
      } satisfies BrowserAiConfigRecord);
      await transactionDone(transaction);
    },

    async clear(): Promise<void> {
      const database = await openBrowserDatabase();
      const transaction = database.transaction('settings', 'readwrite');
      transaction.objectStore('settings').delete(AI_CONFIG_KEY);
      await transactionDone(transaction);
    }
  };
}
