import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearRuntimeModelConfig,
  createDeepSeekSkillRunner,
  getModelStatus,
  readConfigFromEnv,
  setRuntimeModelConfig,
  testModelConnection
} from '../main/deepSeekClient';
import type { StorySkillRequest } from '../shared/types';

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

describe('deepSeekClient', () => {
  afterEach(() => {
    clearRuntimeModelConfig();
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
      baseUrl: 'https://api.deepseek.com'
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
        model: 'gpt-4o-mini',
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
      OPENAI_MODEL: 'gpt-4o-mini',
      OPENAI_BASE_URL: 'https://api.openai.com/v1',
      DEEPSEEK_API_KEY: 'deepseek-test-key'
    });

    expect(config).toMatchObject({
      apiKey: 'openai-test-key',
      model: 'gpt-4o-mini',
      baseUrl: 'https://api.openai.com/v1',
      provider: 'openai'
    });
  });

  it('reports provider status without exposing the API key', () => {
    const status = getModelStatus({
      OPENAI_API_KEY: 'secret-test-key',
      OPENAI_MODEL: 'gpt-4o-mini',
      OPENAI_BASE_URL: 'https://api.openai.com/v1'
    });

    expect(status).toEqual({
      configured: true,
      provider: 'openai',
      model: 'gpt-4o-mini',
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
      model: 'deepseek-v4-flash',
      baseUrl: 'https://api.deepseek.com',
      provider: 'deepseek'
    });
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
          model: 'gpt-4o-mini',
          baseUrl: 'https://api.openai.com/v1'
        },
        fetchMock
      )
    ).resolves.toEqual({
      ok: true,
      provider: 'openai',
      model: 'gpt-4o-mini',
      message: 'Model connection succeeded'
    });
  });

  it('diagnoses the known Right Code draw endpoint and gpt-4o-mini mismatch before making a request', async () => {
    const fetchMock = vi.fn();

    await expect(
      testModelConnection(
        {
          apiKey: 'test-key',
          provider: 'openai',
          model: 'gpt-4o-mini',
          baseUrl: 'https://www.right.codes/draw/v1'
        },
        fetchMock
      )
    ).resolves.toEqual({
      ok: false,
      provider: 'openai',
      model: 'gpt-4o-mini',
      message: 'Right Code draw endpoint is not configured for gpt-4o-mini. Set OPENAI_MODEL to a model enabled for /draw, or use a chat-compatible base URL.'
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns a safe failure result when connectivity fails', async () => {
    await expect(testModelConnection({ apiKey: '', provider: 'openai', model: 'gpt-4o-mini' }, vi.fn())).resolves.toEqual({
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
      model: 'gpt-4o-mini',
      baseUrl: 'https://api.openai.com/v1'
    });

    expect(status).toEqual({
      configured: true,
      provider: 'openai',
      model: 'gpt-4o-mini',
      baseUrl: 'https://api.openai.com/v1'
    });
    expect(getModelStatus({})).toEqual(status);
    expect(JSON.stringify(status)).not.toContain('runtime-secret-key');
  });
});
