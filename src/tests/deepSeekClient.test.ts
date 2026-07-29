import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearRuntimeModelConfig,
  createBenchmarkSkillRunner,
  createDeepSeekSkillRunner,
  fetchWithTimeout,
  getModelStatus,
  readConfigFromEnv,
  setRuntimeModelConfig,
  testModelConnection
} from '../main/deepSeekClient';
import type { StorySkillRequest, WorkflowBenchmarkRunRequest } from '../shared/types';

function skillRequest(overrides: Partial<StorySkillRequest> = {}): StorySkillRequest {
  return {
    skillId: 'theme-generator',
    systemPrompt: '你是主题生成器。',
    userPrompt: '生成主题。',
    schemaHint: '{"title":"string"}',
    outputSchema: '{"title":"string"}',
    repairPrompt: '只返回符合 schema 的 JSON',
    exampleInput: '{"idea":"荒原故事"}',
    exampleOutput: '{"title":"荒原守望者"}',
    ...overrides
  };
}

const benchmarkRequest: WorkflowBenchmarkRunRequest = {
  provider: 'deepseek',
  model: 'deepseek-v4-pro',
  temperature: 0.7,
  maxTokens: 6000
};

describe('deepSeekClient', () => {
  afterEach(() => {
    clearRuntimeModelConfig();
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('calls DeepSeek chat completions and parses JSON skill output', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"title":"荒原守望者"}' } }]
      })
    });
    const runner = createDeepSeekSkillRunner({
      apiKey: 'test-key',
      model: 'deepseek-chat',
      baseUrl: 'https://api.deepseek.com',
      temperature: 0.7,
      maxTokens: 6000
    }, fetchMock);

    const response = await runner(skillRequest());

    expect(response).toEqual({
      skillId: 'theme-generator',
      provider: 'deepseek',
      output: { title: '荒原守望者' }
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.deepseek.com/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json'
        })
      })
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.model).toBe('deepseek-chat');
    expect(body.temperature).toBe(0.7);
    expect(body.max_tokens).toBe(6000);
    expect(body.stream).toBe(false);
    expect(body.thinking).toEqual({ type: 'disabled' });
    expect(body.response_format).toEqual({ type: 'json_object' });
    expect(body.messages[0].content).toContain('你是主题生成器。');
    expect(body.messages[1].content).toContain('生成主题。');
    expect(body.messages[1].content).toContain('{"title":"string"}');
    expect(body.messages[1].content).toContain('只返回符合 schema 的 JSON');
    expect(body.messages[1].content).toContain('{"idea":"荒原故事"}');
    expect(body.messages[1].content).toContain('{"title":"荒原守望者"}');
  });

  it('creates a benchmark runner only for the locked configured provider and model', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"ok":true}' } }] })
    });
    const runner = createBenchmarkSkillRunner(
      benchmarkRequest,
      { apiKey: 'test-key', provider: 'deepseek', model: 'deepseek-v4-pro', baseUrl: 'https://api.deepseek.com' },
      fetchMock
    );

    await runner(skillRequest());

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.temperature).toBe(0.7);
    expect(body.max_tokens).toBe(6000);
  });

  it('repairs an invalid JSON model response with one locked follow-up call', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: '{"items":["broken" "json"]}' } }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: '{"items":["repaired"]}' } }] }) });
    const runner = createBenchmarkSkillRunner(
      benchmarkRequest,
      { apiKey: 'test-key', provider: 'deepseek', model: 'deepseek-v4-pro', baseUrl: 'https://api.deepseek.com' },
      fetchMock
    );

    await expect(runner(skillRequest())).resolves.toMatchObject({ output: { items: ['repaired'] } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const repairBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(repairBody.model).toBe('deepseek-v4-pro');
    expect(repairBody.temperature).toBe(0.7);
    expect(repairBody.max_tokens).toBe(6000);
    expect(repairBody.messages[1].content).toContain('{"items":["broken" "json"]}');
  });

  it('reports a provider-safe timeout when a request is aborted by its ten-second deadline', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, init: RequestInit) => new Promise<never>((_, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('This operation was aborted', 'AbortError')));
    }));
    const runner = createDeepSeekSkillRunner(
      { apiKey: 'test-key', provider: 'deepseek', baseUrl: 'https://api.deepseek.com', timeoutMs: 10_000 },
      fetchMock
    );

    const result = runner(skillRequest());
    const timeoutExpectation = expect(result).rejects.toThrow('DeepSeek request timed out after 10 seconds');
    await vi.advanceTimersByTimeAsync(10_000);

    await timeoutExpectation;
  });

  it('gives JSON repair its own full timeout budget', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [{ message: { content: '{invalid json}' } }] }) })
      .mockImplementationOnce((_url: string, init: RequestInit) => new Promise<never>((_, reject) => {
        init.signal?.addEventListener('abort', () => reject(new DOMException('This operation was aborted', 'AbortError')));
      }));
    const runner = createDeepSeekSkillRunner(
      { apiKey: 'test-key', provider: 'deepseek', baseUrl: 'https://api.deepseek.com', timeoutMs: 10_000 },
      fetchMock
    );

    const result = runner(skillRequest());
    const timeoutExpectation = expect(result).rejects.toThrow('DeepSeek request timed out after 10 seconds');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(9_999);
    await expect(Promise.race([result, Promise.resolve('still-running')])).resolves.toBe('still-running');
    await vi.advanceTimersByTimeAsync(1);

    await timeoutExpectation;
  });

  it('refuses a benchmark runner when the configured model differs from the locked request', () => {
    expect(() => createBenchmarkSkillRunner(
      benchmarkRequest,
      { apiKey: 'test-key', provider: 'deepseek', model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com' },
      vi.fn()
    )).toThrow('Benchmark provider or model does not match the locked run request');
  });

  it('fails clearly when the API key is missing', async () => {
    const runner = createDeepSeekSkillRunner({ apiKey: '' }, vi.fn());

    await expect(
      runner(skillRequest({ systemPrompt: 'system', userPrompt: 'user', schemaHint: '{}', outputSchema: '{}' }))
    ).rejects.toThrow('OPENAI_API_KEY or DEEPSEEK_API_KEY is not configured');
  });

  it('names the active provider when a model request fails', async () => {
    const runner = createDeepSeekSkillRunner(
      {
        apiKey: 'test-key',
        provider: 'openai',
        model: 'gpt-5.6',
        baseUrl: 'https://api.openai.com/v1'
      },
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => '{"error":"bad request"}',
        json: async () => ({})
      })
    );

    await expect(
      runner(skillRequest({ systemPrompt: 'system', userPrompt: 'user', schemaHint: '{}', outputSchema: '{}' }))
    ).rejects.toThrow('OpenAI request failed: 400 {"error":"bad request"}');
  });

  it('prefers OpenAI-compatible environment variables when present', () => {
    const config = readConfigFromEnv({
      OPENAI_API_KEY: 'openai-test-key',
      OPENAI_MODEL: 'gpt-5.6',
      OPENAI_BASE_URL: 'https://api.openai.com/v1',
      DEEPSEEK_API_KEY: 'deepseek-test-key'
    });

    expect(config).toMatchObject({
      apiKey: 'openai-test-key',
      model: 'gpt-5.6',
      baseUrl: 'https://api.openai.com/v1',
      provider: 'openai'
    });
  });

  it('reports provider status without exposing the API key', () => {
    const status = getModelStatus({
      OPENAI_API_KEY: 'secret-test-key',
      OPENAI_MODEL: 'gpt-5.6',
      OPENAI_BASE_URL: 'https://api.openai.com/v1'
    });

    expect(status).toEqual({
      configured: true,
      provider: 'openai',
      model: 'gpt-5.6',
      baseUrl: 'https://api.openai.com/v1'
    });
    expect(JSON.stringify(status)).not.toContain('secret-test-key');
  });

  it('reports mock fallback status when no provider key is configured', () => {
    expect(getModelStatus({})).toEqual({
      configured: false,
      provider: 'mock',
      model: 'mock',
      baseUrl: ''
    });
  });

  it('uses the current DeepSeek default model when no model is specified', () => {
    const config = readConfigFromEnv({
      DEEPSEEK_API_KEY: 'deepseek-test-key'
    });

    expect(config).toMatchObject({
      apiKey: 'deepseek-test-key',
      model: 'deepseek-v4-pro',
      baseUrl: 'https://api.deepseek.com',
      provider: 'deepseek'
    });
  });

  it('uses a five-minute timeout when no request timeout is configured', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, init: RequestInit) => new Promise<never>((_, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('This operation was aborted', 'AbortError')));
    }));
    const runner = createDeepSeekSkillRunner(
      { apiKey: 'test-key', provider: 'deepseek', baseUrl: 'https://api.deepseek.com' },
      fetchMock
    );

    const result = runner(skillRequest());
    const timeoutExpectation = expect(result).rejects.toThrow('DeepSeek request timed out after 300 seconds');
    await vi.advanceTimersByTimeAsync(299_999);
    await expect(Promise.race([result, Promise.resolve('still-running')])).resolves.toBe('still-running');
    await vi.advanceTimersByTimeAsync(1);

    await timeoutExpectation;
  });

  it('preserves the matching provider environment timeout when UI runtime config omits one', async () => {
    vi.useFakeTimers();
    vi.stubEnv('OPENAI_API_KEY', 'openai-test-key');
    vi.stubEnv('OPENAI_TIMEOUT_MS', '10000');
    const fetchMock = vi.fn((_url: string, init: RequestInit) => new Promise<never>((_, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('This operation was aborted', 'AbortError')));
    }));
    setRuntimeModelConfig({
      provider: 'openai',
      apiKey: 'runtime-secret-key',
      model: 'gpt-5.6',
      baseUrl: 'https://api.openai.com/v1'
    });

    const result = createDeepSeekSkillRunner(undefined, fetchMock)(skillRequest());
    const timeoutExpectation = expect(result).rejects.toThrow('OpenAI request timed out after 10 seconds');
    await vi.advanceTimersByTimeAsync(10_000);

    await timeoutExpectation;
  });

  it('uses the selected provider timeout when both provider environment configurations exist', async () => {
    vi.useFakeTimers();
    vi.stubEnv('OPENAI_API_KEY', 'openai-test-key');
    vi.stubEnv('OPENAI_TIMEOUT_MS', '10000');
    vi.stubEnv('DEEPSEEK_API_KEY', 'deepseek-test-key');
    vi.stubEnv('DEEPSEEK_TIMEOUT_MS', '20000');
    const pendingFetch = (_url: string, init: RequestInit) => new Promise<never>((_, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('This operation was aborted', 'AbortError')));
    });

    setRuntimeModelConfig({ provider: 'deepseek', apiKey: 'runtime-key', model: 'deepseek-v4-pro', baseUrl: 'https://api.deepseek.com' });
    const deepSeekResult = createDeepSeekSkillRunner(undefined, vi.fn(pendingFetch))(skillRequest());
    const deepSeekTimeout = expect(deepSeekResult).rejects.toThrow('DeepSeek request timed out after 20 seconds');
    await vi.advanceTimersByTimeAsync(20_000);
    await deepSeekTimeout;

    setRuntimeModelConfig({ provider: 'openai', apiKey: 'runtime-key', model: 'gpt-5.6', baseUrl: 'https://api.openai.com/v1' });
    const openAiResult = createDeepSeekSkillRunner(undefined, vi.fn(pendingFetch))(skillRequest());
    const openAiTimeout = expect(openAiResult).rejects.toThrow('OpenAI request timed out after 10 seconds');
    await vi.advanceTimersByTimeAsync(10_000);
    await openAiTimeout;
  });

  it('passes external cancellation through without rewriting it as a timeout', async () => {
    const externalController = new AbortController();
    const fetchMock = vi.fn((_url: string, init: RequestInit) => new Promise<never>((_, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('This operation was aborted', 'AbortError')));
    }));
    const result = fetchWithTimeout(fetchMock, 'https://example.test', { signal: externalController.signal }, 10_000, 'deepseek');
    const abortExpectation = expect(result).rejects.toMatchObject({ name: 'AbortError', message: 'This operation was aborted' });

    externalController.abort();

    await abortExpectation;
  });

  it('rejects a non-integer request timeout before issuing a fetch', async () => {
    const fetchMock = vi.fn();
    const runner = createDeepSeekSkillRunner(
      { apiKey: 'test-key', provider: 'deepseek', baseUrl: 'https://api.deepseek.com', timeoutMs: 1.5 },
      fetchMock
    );

    await expect(runner(skillRequest())).rejects.toThrow('Request timeout must be a positive integer number of milliseconds');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('tests model connectivity through a minimal skill call', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"ok":true}' } }]
      })
    });

    await expect(
      testModelConnection(
        {
          apiKey: 'test-key',
          provider: 'openai',
          model: 'gpt-5.6',
          baseUrl: 'https://api.openai.com/v1'
        },
        fetchMock
      )
    ).resolves.toEqual({
      ok: true,
      provider: 'openai',
      model: 'gpt-5.6',
      message: 'Model connection succeeded'
    });
  });

  it('diagnoses the known Right Code draw endpoint and gpt-5.6 mismatch before making a request', async () => {
    const fetchMock = vi.fn();

    await expect(
      testModelConnection(
        {
          apiKey: 'test-key',
          provider: 'openai',
          model: 'gpt-5.6',
          baseUrl: 'https://www.right.codes/draw/v1'
        },
        fetchMock
      )
    ).resolves.toEqual({
      ok: false,
      provider: 'openai',
      model: 'gpt-5.6',
      message: 'Right Code draw endpoint is not configured for gpt-5.6. Set OPENAI_MODEL to a model enabled for /draw, or use a chat-compatible base URL.'
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a safe failure result when connectivity fails', async () => {
    await expect(testModelConnection({ apiKey: '', provider: 'openai', model: 'gpt-5.6' }, vi.fn())).resolves.toEqual({
      ok: false,
      provider: 'mock',
      model: 'mock',
      message: 'OPENAI_API_KEY or DEEPSEEK_API_KEY is not configured'
    });
  });

  it('stores session model config without exposing the API key in status', () => {
    const status = setRuntimeModelConfig({
      provider: 'openai',
      apiKey: 'runtime-secret-key',
      model: 'gpt-5.6',
      baseUrl: 'https://api.openai.com/v1'
    });

    expect(status).toEqual({
      configured: true,
      provider: 'openai',
      model: 'gpt-5.6',
      baseUrl: 'https://api.openai.com/v1'
    });
    expect(getModelStatus({})).toEqual(status);
    expect(JSON.stringify(status)).not.toContain('runtime-secret-key');
  });
});
