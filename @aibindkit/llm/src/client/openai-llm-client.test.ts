import assert from 'node:assert/strict';
import test from 'node:test';
import { OpenaiLlmClient } from './openai-llm-client';

const originalFetch = globalThis.fetch;

test('sends a chat completion request and passes through the response', async () => {
  let requestBody: Record<string, unknown> | undefined;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), 'https://gateway.example/v1/chat/completions');
    assert.equal(init?.method, 'POST');
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer secret');
    assert.equal(new Headers(init?.headers).get('Content-Type'), 'application/json');
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Response.json({
      choices: [
        {
          message: {
            role: 'assistant',
            content: null,
            refusal: null,
            tool_calls: [
              {
                id: 'call-1',
                type: 'function',
                function: {
                  name: 'get_current_time',
                  arguments: '{}'
                }
              }
            ]
          }
        }
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
        prompt_tokens_details: {
          cached_tokens: 2
        }
      }
    });
  };

  try {
    const client = new OpenaiLlmClient({ url: 'https://gateway.example/v1/', apiKey: 'secret' });
    const result = await client.complete(
      AbortSignal.timeout(1_000),
      { name: 'model-a', effectiveContextWindowPercent: 90 },
      [
        { role: 'user', content: 'Hello' },
        Object.assign({ role: 'assistant' as const, content: 'Earlier answer' }, { codexThreadId: 'thread-1' })
      ],
      [
        {
          type: 'function',
          function: {
            name: 'get_current_time',
            description: 'Gets the current time'
          }
        }
      ]
    );

    assert.deepEqual(result, {
      message: {
        role: 'assistant',
        content: null,
        refusal: null,
        tool_calls: [
          {
            id: 'call-1',
            type: 'function',
            function: {
              name: 'get_current_time',
              arguments: '{}'
            }
          }
        ]
      },
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15,
        prompt_tokens_details: {
          cached_tokens: 2
        }
      }
    });
    assert.deepEqual(requestBody, {
      model: 'model-a',
      stream: false,
      messages: [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Earlier answer' }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'get_current_time',
            description: 'Gets the current time'
          }
        }
      ]
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('lists models and reads compatible context-window fields', async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), 'https://gateway.example/v1/models');
    assert.equal(init?.method, undefined);
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer secret');
    assert.equal(new Headers(init?.headers).get('Content-Type'), null);
    return Response.json({
      data: [{ id: 'model-a', context_window: 128_000 }, { id: 'model-b', context_length: 32_000 }, { id: 'model-c' }]
    });
  };

  try {
    const client = new OpenaiLlmClient({ url: 'https://gateway.example/v1', apiKey: 'secret' });
    assert.deepEqual(await client.getModels(AbortSignal.timeout(1_000)), [
      { name: 'model-a', contextWindow: 128_000 },
      { name: 'model-b', contextWindow: 32_000 },
      { name: 'model-c', contextWindow: undefined }
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('reports API error messages', async () => {
  globalThis.fetch = async () => {
    return Response.json({ error: { message: 'Invalid API key' } }, { status: 401 });
  };

  try {
    const client = new OpenaiLlmClient({ url: 'https://gateway.example/v1', apiKey: 'secret' });
    await assert.rejects(
      client.getModels(AbortSignal.timeout(1_000)),
      error => error instanceof Error && error.name === 'LlmClientError' && error.message === 'Invalid API key'
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
