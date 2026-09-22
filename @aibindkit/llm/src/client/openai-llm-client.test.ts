import assert from 'node:assert/strict';
import test from 'node:test';
import { OpenaiLlmClient } from './openai-llm-client';

const originalFetch = globalThis.fetch;

test('sends a chat completion request and passes through the response', async () => {
  let requestBody: Record<string, unknown> | undefined;
  let requestCount = 0;
  globalThis.fetch = async (input, init) => {
    requestCount++;
    assert.equal(String(input), 'https://gateway.example/v1/chat/completions');
    assert.equal(init?.method, 'POST');
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer secret');
    assert.equal(new Headers(init?.headers).get('Content-Type'), 'application/json');
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    if (requestCount === 1) {
      return Response.json({ error: { message: 'Try again' } }, { status: 429, headers: { 'retry-after-ms': '1' } });
    }
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
    const client = new OpenaiLlmClient({ url: 'https://gateway.example/v1/', apiKey: 'secret' }, console);
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
    assert.equal(requestCount, 2);
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
    const client = new OpenaiLlmClient({ url: 'https://gateway.example/v1', apiKey: 'secret' }, console);
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
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount++;
    return Response.json({ error: { message: 'Invalid API key' } }, { status: 401 });
  };

  try {
    const client = new OpenaiLlmClient({ url: 'https://gateway.example/v1', apiKey: 'secret' }, console);
    await assert.rejects(
      client.getModels(AbortSignal.timeout(1_000)),
      error => error instanceof Error && error.name === 'LlmClientError' && error.message === 'Invalid API key'
    );
    assert.equal(requestCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('limits retries for server errors', async () => {
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount++;
    return Response.json({ error: { message: 'Temporarily unavailable' } }, { status: 503, headers: { 'retry-after-ms': '1' } });
  };

  try {
    const client = new OpenaiLlmClient({ url: 'https://gateway.example/v1', apiKey: 'secret' }, console);
    await assert.rejects(
      client.getModels(AbortSignal.timeout(1_000)),
      error => error instanceof Error && error.message === 'Temporarily unavailable'
    );
    assert.equal(requestCount, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('does not retry after aborting', async () => {
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount++;
    return Response.json({ error: { message: 'Try again' } }, { status: 429, headers: { 'retry-after-ms': '50' } });
  };

  try {
    const abortController = new AbortController();
    const client = new OpenaiLlmClient({ url: 'https://gateway.example/v1', apiKey: 'secret' }, console);
    const models = client.getModels(abortController.signal);
    abortController.abort();
    await assert.rejects(models, error => error === abortController.signal.reason);
    assert.equal(requestCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
