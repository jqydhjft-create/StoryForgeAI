import { describe, expect, it, vi } from 'vitest';

import { createBrowserSkillRunner } from '../renderer/services/browser/browserSkillRunner';
import type { StorySkillRequest } from '../shared/types';

const secret = 'browser-secret-api-key';

function skillRequest(overrides: Partial<StorySkillRequest> = {}): StorySkillRequest {
  return {
    skillId: 'theme-generator',
    systemPrompt: 'Return JSON only.',
    userPrompt: 'Generate a story theme.',
    schemaHint: '{"title":"string"}',
    outputSchema: '{"title":"string"}',
    repairPrompt: 'Repair the response and return valid JSON only.',
    exampleInput: '{"idea":"A desert story"}',
    exampleOutput: '{"title":"Desert Sentinel"}',
    ...overrides
  };
}

describe('browserSkillRunner', () => {
  it('posts a compatible DeepSeek request to the normalized chat completions URL', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ choices: [{ message: { content: '{"title":"Desert Sentinel"}' } }] }), { status: 200 })
    );
    const request = skillRequest();
    const runner = createBrowserSkillRunner(
      { provider: 'deepseek', apiKey: secret, model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com///' },
      fetchMock
    );

    await expect(runner(request)).resolves.toEqual({
      skillId: 'theme-generator',
      provider: 'deepseek',
      output: { title: 'Desert Sentinel' }
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.deepseek.com/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' }
      })
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      model: 'deepseek-chat',
      stream: false,
      response_format: { type: 'json_object' },
      thinking: { type: 'disabled' },
      messages: [
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
      ]
    });
  });

  it('repairs one invalid model response using the repair prompt', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: 'not JSON' } }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: 'prefix {"title":"Repaired"} suffix' } }] }), { status: 200 }));
    const request = skillRequest();

    await expect(
      createBrowserSkillRunner({ provider: 'openai', apiKey: secret, model: 'gpt-5', baseUrl: 'https://api.openai.com/v1' }, fetchMock)(request)
    ).resolves.toEqual({ skillId: 'theme-generator', provider: 'openai', output: { title: 'Repaired' } });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const repairBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(repairBody.messages).toEqual([
      { role: 'system', content: request.systemPrompt },
      { role: 'user', content: request.repairPrompt }
    ]);
    expect(repairBody.thinking).toBeUndefined();
  });

  it('extracts the first JSON object while ignoring quoted braces and escaped quotes', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            { message: { content: 'prefix {"title":"a { brace } and \\"quote\\" plus \\\\ slash"} trailing {"extra":true}' } }
          ]
        }),
        { status: 200 }
      )
    );

    await expect(
      createBrowserSkillRunner({ provider: 'openai', apiKey: secret, model: 'gpt-5', baseUrl: 'https://api.openai.com/v1' }, fetchMock)(
        skillRequest()
      )
    ).resolves.toEqual({
      skillId: 'theme-generator',
      provider: 'openai',
      output: { title: 'a { brace } and "quote" plus \\ slash' }
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('redacts the API key from HTTP errors', async () => {
    const runner = createBrowserSkillRunner(
      { provider: 'openai', apiKey: secret, model: 'gpt-5', baseUrl: 'https://api.openai.com/v1' },
      vi.fn<typeof fetch>().mockResolvedValue(new Response(`Unauthorized for ${secret}`, { status: 401, statusText: 'Unauthorized' }))
    );

    await expect(runner(skillRequest())).rejects.toThrow('OpenAI request failed: 401');
    await expect(runner(skillRequest())).rejects.not.toThrow(secret);
  });

  it('reports rejected fetch calls with the browser-safe connection message', async () => {
    const runner = createBrowserSkillRunner(
      { provider: 'openai', apiKey: secret, model: 'gpt-5', baseUrl: 'https://api.openai.com/v1' },
      vi.fn<typeof fetch>().mockRejectedValue(new Error(`network failure for ${secret}`))
    );

    await expect(runner(skillRequest())).rejects.toThrow(
      'Unable to reach the model endpoint. Check the network connection, Base URL, and browser CORS support.'
    );
  });
});
