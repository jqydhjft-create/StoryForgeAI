import type { AiProviderConfigInput, StorySkillRequest, StorySkillResponse } from '../../../shared/types';
import type { StorySkillRunner } from '../storySkillContracts';

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

const connectionError = 'Unable to reach the model endpoint. Check the network connection, Base URL, and browser CORS support.';

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

function providerLabel(provider: AiProviderConfigInput['provider']): string {
  return provider === 'openai' ? 'OpenAI' : 'DeepSeek';
}

function parseJsonContent(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const objectContent = extractFirstJsonObject(content);
    if (objectContent) {
      return JSON.parse(objectContent);
    }
    throw new Error('Model response did not contain valid JSON');
  }
}

function extractFirstJsonObject(content: string): string | null {
  const start = content.indexOf('{');
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < content.length; index += 1) {
    const character = content[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === '\\') {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        return content.slice(start, index + 1);
      }
    }
  }

  return null;
}

function requestMessages(request: StorySkillRequest): Array<{ role: 'system' | 'user'; content: string }> {
  return [
    { role: 'system', content: request.systemPrompt },
    {
      role: 'user',
      content: [
        request.userPrompt,
        '',
        request.repairPrompt,
        '',
        'Output schema:',
        request.outputSchema,
        '',
        'Example input:',
        request.exampleInput,
        '',
        'Example output:',
        request.exampleOutput
      ].join('\n')
    }
  ];
}

export function createBrowserSkillRunner(
  config: AiProviderConfigInput,
  fetchImpl: typeof fetch = fetch
): StorySkillRunner {
  const apiKey = config.apiKey.trim();
  const endpoint = `${normalizeBaseUrl(config.baseUrl)}/chat/completions`;

  async function complete(messages: Array<{ role: 'system' | 'user'; content: string }>): Promise<string> {
    let response: Response;
    try {
      response = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model,
          stream: false,
          response_format: { type: 'json_object' },
          ...(config.provider === 'deepseek' ? { thinking: { type: 'disabled' } } : {}),
          messages
        })
      });
    } catch {
      throw new Error(connectionError);
    }

    if (!response.ok) {
      throw new Error(`${providerLabel(config.provider)} request failed: ${response.status}`);
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Model response was empty');
    }

    return content;
  }

  return async (request): Promise<StorySkillResponse> => {
    if (!apiKey) {
      throw new Error('API key is not configured');
    }

    const firstContent = await complete(requestMessages(request));
    let output: unknown;
    try {
      output = parseJsonContent(firstContent);
    } catch {
      const repairedContent = await complete([
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.repairPrompt }
      ]);
      output = parseJsonContent(repairedContent);
    }

    return { skillId: request.skillId, provider: config.provider, output };
  };
}
