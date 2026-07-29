import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { StoryStarter } from '../renderer/components/StoryStarter';

describe('StoryStarter provider boundary', () => {
  it('renders a localized clear API key action without exposing the key', () => {
    const onClearApiKey = vi.fn();
    const html = renderToStaticMarkup(createElement(StoryStarter, {
      language: 'en', initialIdea: '', isBusy: false, statusText: '', error: '',
      aiStatus: { configured: true, provider: 'openai', model: 'gpt-5.6', baseUrl: 'https://api.openai.com/v1' }, aiConnectionResult: null,
      aiConfigDraft: { provider: 'openai', apiKey: '', model: 'gpt-5.6', baseUrl: 'https://api.openai.com/v1' },
      isAiTesting: false, isAiConfigApplying: false,
      onIdeaChange: vi.fn(), onRandomSeed: vi.fn(async () => ''), onStartWorkflow: vi.fn(),
      onAiConfigDraftChange: vi.fn(), onApiKeyChange: vi.fn(), onApplyAiConfig: vi.fn(), onTestAiConnection: vi.fn(), onClearApiKey
    }));

    expect(html).toContain('Clear API key');
    expect(html).toContain('data-action="clear-api-key"');
  });

  it('does not render a secret-shaped value supplied alongside its non-secret draft', () => {
    const secret = 'synthetic-secret-must-not-render';
    const html = renderToStaticMarkup(createElement(StoryStarter, {
      language: 'en', initialIdea: '', isBusy: false, statusText: '', error: '',
      aiStatus: { configured: false, provider: 'mock', model: 'mock', baseUrl: '' }, aiConnectionResult: null,
      aiConfigDraft: { provider: 'openai', model: 'gpt-5.6', baseUrl: 'https://api.openai.com/v1', apiKey: secret } as never,
      isAiTesting: false, isAiConfigApplying: false,
      onIdeaChange: vi.fn(), onRandomSeed: vi.fn(async () => ''), onStartWorkflow: vi.fn(),
      onAiConfigDraftChange: vi.fn(), onApiKeyChange: vi.fn(), onApplyAiConfig: vi.fn(), onTestAiConnection: vi.fn()
    }));

    expect(html).not.toContain(secret);
  });

  it('redacts a provider connection error before rendering it', () => {
    const secret = 'Authorization: Bearer synthetic-bearer-token-value';
    const html = renderToStaticMarkup(createElement(StoryStarter, {
      language: 'en', initialIdea: '', isBusy: false, statusText: '', error: '',
      aiStatus: { configured: false, provider: 'mock', model: 'mock', baseUrl: '' },
      aiConnectionResult: { ok: false, provider: 'openai', model: 'gpt-5.6', message: secret },
      aiConfigDraft: { provider: 'openai', apiKey: '', model: 'gpt-5.6', baseUrl: 'https://api.openai.com/v1' },
      isAiTesting: false, isAiConfigApplying: false,
      onIdeaChange: vi.fn(), onRandomSeed: vi.fn(async () => ''), onStartWorkflow: vi.fn(),
      onAiConfigDraftChange: vi.fn(), onApiKeyChange: vi.fn(), onApplyAiConfig: vi.fn(), onTestAiConnection: vi.fn()
    }));

    expect(html).not.toContain('synthetic-bearer-token-value');
  });
});
