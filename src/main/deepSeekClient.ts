import type {
  AiConnectionTestResult,
  AiProviderConfigInput,
  AiProviderStatus,
  StorySkillRequest,
  StorySkillResponse
} from '../shared/types.js';

export interface DeepSeekConfig {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  provider?: 'openai' | 'deepseek';
}

type FetchLike = (url: string, init: RequestInit) => Promise<{
  ok: boolean;
  status?: number;
  statusText?: string;
  text?: () => Promise<string>;
  json: () => Promise<unknown>;
}>;

interface DeepSeekChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export type StorySkillRunner = (request: StorySkillRequest) => Promise<StorySkillResponse>;

let runtimeModelConfig: DeepSeekConfig | null = null;

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function providerLabel(provider: DeepSeekConfig['provider']): string {
  return provider === 'openai' ? 'OpenAI' : 'DeepSeek';
}

function diagnoseKnownConfigMismatch(config: DeepSeekConfig): string | null {
  const baseUrl = normalizeBaseUrl(config.baseUrl ?? '');
  if (
    config.provider === 'openai' &&
    /right\.codes\/draw\/v1$/i.test(baseUrl) &&
    (config.model ?? 'gpt-4o-mini') === 'gpt-4o-mini'
  ) {
    return 'Right Code draw endpoint is not configured for gpt-4o-mini. Set OPENAI_MODEL to a model enabled for /draw, or use a chat-compatible base URL.';
  }

  return null;
}

type EnvLike = Record<string, string | undefined>;

function defaultModelForProvider(provider: DeepSeekConfig['provider']): string {
  return provider === 'openai' ? 'gpt-4o-mini' : 'deepseek-v4-flash';
}

export function readConfigFromEnv(env: EnvLike = process.env): DeepSeekConfig {
  if (env.OPENAI_API_KEY) {
    return {
      apiKey: env.OPENAI_API_KEY,
      model: env.OPENAI_MODEL ?? 'gpt-4o-mini',
      baseUrl: env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
      timeoutMs: env.OPENAI_TIMEOUT_MS ? Number(env.OPENAI_TIMEOUT_MS) : undefined,
      provider: 'openai'
    };
  }

  return {
    apiKey: env.DEEPSEEK_API_KEY,
    model: env.DEEPSEEK_MODEL ?? defaultModelForProvider('deepseek'),
    baseUrl: env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
    timeoutMs: env.DEEPSEEK_TIMEOUT_MS ? Number(env.DEEPSEEK_TIMEOUT_MS) : undefined,
    provider: 'deepseek'
  };
}

export function getModelStatus(env: EnvLike = process.env): AiProviderStatus {
  const config = runtimeModelConfig ?? readConfigFromEnv(env);
  if (!config.apiKey?.trim()) {
    return {
      configured: false,
      provider: 'mock',
      model: 'mock',
      baseUrl: ''
    };
  }

  return {
    configured: true,
    provider: config.provider ?? 'deepseek',
    model: config.model ?? defaultModelForProvider(config.provider),
    baseUrl: config.baseUrl ?? (config.provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.deepseek.com')
  };
}

export function setRuntimeModelConfig(input: AiProviderConfigInput): AiProviderStatus {
  runtimeModelConfig = {
    apiKey: input.apiKey,
    provider: input.provider,
    model: input.model || defaultModelForProvider(input.provider),
    baseUrl: input.baseUrl || (input.provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.deepseek.com')
  };

  return getModelStatus({});
}

export function clearRuntimeModelConfig(): void {
  runtimeModelConfig = null;
}

function readActiveConfig(): DeepSeekConfig {
  return runtimeModelConfig ?? readConfigFromEnv();
}

function parseJsonContent(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const match = /\{[\s\S]*\}/.exec(content);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('DeepSeek response did not contain valid JSON');
  }
}

export function createDeepSeekSkillRunner(
  config: DeepSeekConfig = readActiveConfig(),
  fetchImpl: FetchLike = fetch as FetchLike
): StorySkillRunner {
  return async (request) => {
    const apiKey = config.apiKey?.trim();
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY or DEEPSEEK_API_KEY is not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs ?? 30000);

    try {
      const response = await fetchImpl(`${normalizeBaseUrl(config.baseUrl ?? 'https://api.deepseek.com')}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model ?? defaultModelForProvider(config.provider),
          stream: false,
          response_format: { type: 'json_object' },
          ...(config.provider !== 'openai' ? { thinking: { type: 'disabled' } } : {}),
          messages: [
            { role: 'system', content: request.systemPrompt },
            {
              role: 'user',
              content: [
                request.userPrompt,
                '',
                request.repairPrompt,
                '',
                '输出 schema:',
                request.outputSchema,
                '',
                '输入示例:',
                request.exampleInput,
                '',
                '输出示例:',
                request.exampleOutput
              ].join('\n')
            }
          ]
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const detail = response.text ? await response.text() : response.statusText;
        throw new Error(
          `${providerLabel(config.provider)} request failed: ${response.status ?? 'unknown'} ${detail ?? ''}`.trim()
        );
      }

      const payload = (await response.json()) as DeepSeekChatResponse;
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('DeepSeek response was empty');
      }

      return {
        skillId: request.skillId,
        provider: config.provider ?? 'deepseek',
        output: parseJsonContent(content)
      };
    } finally {
      clearTimeout(timeout);
    }
  };
}

export async function testModelConnection(
  config: DeepSeekConfig = readActiveConfig(),
  fetchImpl: FetchLike = fetch as FetchLike
): Promise<AiConnectionTestResult> {
  const status = getModelStatus({
    OPENAI_API_KEY: config.provider === 'openai' ? config.apiKey : undefined,
    OPENAI_MODEL: config.provider === 'openai' ? config.model : undefined,
    OPENAI_BASE_URL: config.provider === 'openai' ? config.baseUrl : undefined,
    DEEPSEEK_API_KEY: config.provider !== 'openai' ? config.apiKey : undefined,
    DEEPSEEK_MODEL: config.provider !== 'openai' ? config.model : undefined,
    DEEPSEEK_BASE_URL: config.provider !== 'openai' ? config.baseUrl : undefined
  });

  if (!status.configured) {
    return {
      ok: false,
      provider: 'mock',
      model: 'mock',
      message: 'OPENAI_API_KEY or DEEPSEEK_API_KEY is not configured'
    };
  }

  const configMismatch = diagnoseKnownConfigMismatch(config);
  if (configMismatch) {
    return {
      ok: false,
      provider: status.provider,
      model: status.model,
      message: configMismatch
    };
  }

  try {
    const runner = createDeepSeekSkillRunner(config, fetchImpl);
    await runner({
      skillId: 'theme-generator',
      systemPrompt: 'Return only JSON.',
      userPrompt: 'Return a JSON object with ok true.',
      schemaHint: '{"ok":true}',
      outputSchema: '{"ok":true}',
      repairPrompt: 'Return only JSON.',
      exampleInput: '{"ping":true}',
      exampleOutput: '{"ok":true}'
    });

    return {
      ok: true,
      provider: status.provider,
      model: status.model,
      message: 'Model connection succeeded'
    };
  } catch (error) {
    return {
      ok: false,
      provider: status.provider,
      model: status.model,
      message: error instanceof Error ? error.message : 'Model connection failed'
    };
  }
}
