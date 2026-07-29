/* @vitest-environment jsdom */
import { act, createElement, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProviderSettings } from '../renderer/components/ProviderSettings';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const containers: HTMLDivElement[] = [];

afterEach(() => {
  containers.splice(0).forEach((container) => container.remove());
});

function renderProvider(onApplyAiConfig = vi.fn()) {
  const container = document.createElement('div');
  document.body.append(container);
  containers.push(container);
  const root = createRoot(container);
  function Harness() {
    const [apiKey, setApiKey] = useState('');
    return createElement(ProviderSettings, {
      aiStatus: { configured: false, provider: 'mock', model: 'mock', baseUrl: '' },
      aiConnectionResult: null,
      aiConfigDraft: { provider: 'openai', apiKey, model: 'gpt-5.6', baseUrl: 'https://api.openai.com/v1' },
      isAiTesting: false, isAiConfigApplying: false,
      onAiConfigDraftChange: vi.fn(), onApiKeyChange: setApiKey,
      onApplyAiConfig: () => { setApiKey(''); onApplyAiConfig(); }, onTestAiConnection: vi.fn()
    });
  }
  act(() => root.render(createElement(Harness)));
  return { container, root, onApplyAiConfig };
}

describe('ProviderSettings browser API-key boundary', () => {
  it('clears the password input immediately after Apply', () => {
    const { container, onApplyAiConfig } = renderProvider();
    const password = container.querySelector<HTMLInputElement>('[data-field="provider-api-key"]');
    const apply = container.querySelector<HTMLButtonElement>('[data-action="apply-provider-config"]');

    act(() => {
      Simulate.change(password!, { target: { value: 'synthetic-secret' } } as never);
    });
    expect(password!.value).toBe('synthetic-secret');

    act(() => apply!.click());

    expect(onApplyAiConfig).toHaveBeenCalledOnce();
    expect(password!.value).toBe('');
  });
});
