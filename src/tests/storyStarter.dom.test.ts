/* @vitest-environment jsdom */
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { Simulate } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StoryStarter } from '../renderer/components/StoryStarter';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const containers: HTMLDivElement[] = [];
afterEach(() => containers.splice(0).forEach((container) => container.remove()));

describe('StoryStarter browser API-key boundary', () => {
  it('clears the password input after Apply and never rehydrates a saved key', () => {
    const container = document.createElement('div');
    document.body.append(container);
    containers.push(container);
    const root = createRoot(container);
    const onApplyAiConfig = vi.fn();
    act(() => {
      root.render(createElement(StoryStarter, {
        language: 'en', initialIdea: 'Idea', isBusy: false, statusText: '', error: '',
        aiStatus: { configured: true, provider: 'openai', model: 'gpt-5.6', baseUrl: 'https://api.openai.com/v1' }, aiConnectionResult: null,
        aiConfigDraft: { provider: 'openai', apiKey: 'saved-key-must-not-rehydrate', model: 'gpt-5.6', baseUrl: 'https://api.openai.com/v1' } as never,
        isAiTesting: false, isAiConfigApplying: false,
        onIdeaChange: vi.fn(), onRandomSeed: vi.fn(async () => ''), onStartWorkflow: vi.fn(),
        onAiConfigDraftChange: vi.fn(), onApiKeyChange: vi.fn(), onApplyAiConfig, onTestAiConnection: vi.fn()
      }));
    });
    act(() => container.querySelector<HTMLButtonElement>('.starter-config-toggle')!.click());
    const password = container.querySelector<HTMLInputElement>('input[type="password"]');
    const apply = [...container.querySelectorAll('button')].find((button) => button.textContent === 'Apply');

    expect(password!.value).toBe('');
    act(() => {
      Simulate.change(password!, { target: { value: 'synthetic-secret' } } as never);
      apply!.click();
    });
    expect(onApplyAiConfig).toHaveBeenCalledOnce();
    expect(password!.value).toBe('');
  });
});
