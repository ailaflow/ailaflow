import type { LlmMessage, ToolDescriptor } from '@aibindkit/core';
import { AnthropicLlmClient, OpenaiLlmClient } from '@aibindkit/llm';
import assert from 'node:assert/strict';
import test from 'node:test';

test('OpenAI-compatible client sends configured endpoint and model', async context => {
  let requestedUrl = '';
  let requestBody: Record<string, unknown> = {};
  context.mock.method(globalThis, 'fetch', async (input: string | URL | Request, init?: RequestInit) => {
    requestedUrl = String(input);
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Response.json({
      choices: [{ message: { role: 'assistant', content: 'Answer', refusal: null } }],
      usage: { total_tokens: 12 }
    });
  });

  const client = new OpenaiLlmClient({ baseUrl: 'https://gateway.example/v1/', apiKey: 'secret' });
  const result = await client.complete(new AbortController().signal, { name: 'model-a' }, [{ role: 'user', content: 'Hello' }], undefined);

  assert.equal(requestedUrl, 'https://gateway.example/v1/chat/completions');
  assert.equal(requestBody.model, 'model-a');
  assert.equal(result.message.content, 'Answer');
  assert.equal(result.totalTokens, 12);
});

test('OpenAI-compatible client fetches models in provider order', async context => {
  let requestedUrl = '';
  context.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    requestedUrl = String(input);
    return Response.json({ data: [{ id: 'model-b' }, { id: 'model-a' }, { id: 'model-b' }] });
  });

  const client = new OpenaiLlmClient({ baseUrl: 'https://gateway.example/v1/', apiKey: 'secret' });
  const models = await client.getModels(new AbortController().signal);

  assert.equal(requestedUrl, 'https://gateway.example/v1/models');
  assert.deepEqual(models, ['model-b', 'model-a', 'model-b']);
});

test('Anthropic client translates complete history, tools, and tool calls', async context => {
  let requestBody: Record<string, unknown> = {};
  context.mock.method(globalThis, 'fetch', async (_: string | URL | Request, init?: RequestInit) => {
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
    return Response.json({
      content: [
        { type: 'text', text: 'Done' },
        { type: 'tool_use', id: 'next-call', name: 'nextTool', input: { value: 2 } }
      ],
      usage: { input_tokens: 10, output_tokens: 5 }
    });
  });

  const history: LlmMessage[] = [
    { role: 'system', content: 'System prompt' },
    { role: 'user', content: 'Start' },
    {
      role: 'assistant',
      content: null,
      refusal: null,
      tool_calls: [{ id: 'first-call', type: 'function', function: { name: 'firstTool', arguments: '{"value":1}' } }]
    },
    { role: 'tool', tool_call_id: 'first-call', content: '{"ok":true}' },
    { role: 'user', content: 'Continue' }
  ];
  const tools: ToolDescriptor[] = [
    {
      type: 'function',
      function: { name: 'nextTool', description: 'Continue work', parameters: { type: 'object', properties: {} } }
    }
  ];

  const client = new AnthropicLlmClient({ apiKey: 'secret' });
  const result = await client.complete(new AbortController().signal, { name: 'claude-model' }, history, tools);

  assert.equal(requestBody.model, 'claude-model');
  assert.equal(requestBody.system, 'System prompt');
  assert.equal(result.message.role, 'assistant');
  if (result.message.role !== 'assistant') {
    throw new Error('Expected an assistant message');
  }
  assert.deepEqual(result.message.tool_calls?.[0], {
    id: 'next-call',
    type: 'function',
    function: { name: 'nextTool', arguments: '{"value":2}' }
  });
  assert.equal(result.totalTokens, 15);
});

test('Anthropic client fetches every models page', async context => {
  const urls: string[] = [];
  context.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    urls.push(String(input));
    return urls.length === 1
      ? Response.json({ data: [{ id: 'claude-b' }], has_more: true, last_id: 'cursor-1' })
      : Response.json({ data: [{ id: 'claude-a' }], has_more: false, last_id: 'cursor-2' });
  });

  const models = await new AnthropicLlmClient({ apiKey: 'secret' }).getModels(new AbortController().signal);

  assert.deepEqual(models, ['claude-a', 'claude-b']);
  assert.equal(urls[0], 'https://api.anthropic.com/v1/models?limit=1000');
  assert.equal(urls[1], 'https://api.anthropic.com/v1/models?limit=1000&after_id=cursor-1');
});
