import type { LlmMessage, ToolDescriptor } from '@aibindkit/core';
import { LlmClientError, LlmCompleteResult, LlmClient, LlmModelSettings } from './llm-client';

type AnthropicContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string };

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: AnthropicContent[];
}

interface AnthropicResponse {
  content?: Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown }>;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
}

interface AnthropicModelsResponse {
  data?: Array<{ id?: string }>;
  error?: { message?: string };
  has_more?: boolean;
  last_id?: string;
}

export class AnthropicLlmClient implements LlmClient {
  public constructor(
    private readonly config: {
      apiKey: string;
    }
  ) {}

  public async complete(
    abortSignal: AbortSignal,
    modelSettings: LlmModelSettings,
    messages: LlmMessage[],
    toolDescriptors: ToolDescriptor[] | undefined
  ): Promise<LlmCompleteResult> {
    const converted = convertMessages(messages);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: this.createHeaders(),
      body: JSON.stringify({
        model: modelSettings.name,
        max_tokens: 4096,
        system: converted.system || undefined,
        messages: converted.messages,
        tools: toolDescriptors?.map(tool => ({
          name: tool.function.name,
          description: tool.function.description,
          input_schema: tool.function.parameters ?? { type: 'object', properties: {} }
        }))
      }),
      signal: abortSignal
    });
    const data = (await response.json()) as AnthropicResponse;
    if (!response.ok) {
      throw new LlmClientError(data.error?.message ?? `Anthropic API returned status ${response.status}`);
    }

    const text = data.content
      ?.filter(block => block.type === 'text')
      .map(block => block.text ?? '')
      .join('');
    const toolCalls = data.content
      ?.filter(block => block.type === 'tool_use')
      .map(block => ({
        id: block.id!,
        type: 'function' as const,
        function: {
          name: block.name!,
          arguments: JSON.stringify(block.input ?? {})
        }
      }));

    return {
      message: {
        role: 'assistant',
        content: text || null,
        tool_calls: toolCalls?.length ? toolCalls : undefined,
        refusal: null
      }
    };
  }

  public async getModels(abortSignal: AbortSignal): Promise<string[]> {
    const models: string[] = [];
    const seenCursors = new Set<string>();
    let afterId: string | undefined;
    for (;;) {
      const url = new URL('https://api.anthropic.com/v1/models');
      url.searchParams.set('limit', '1000');
      if (afterId) {
        url.searchParams.set('after_id', afterId);
      }
      const response = await fetch(url, { headers: this.createHeaders(false), signal: abortSignal });
      const data = await readModelsResponse(response);
      if (!response.ok) {
        throw new LlmClientError(data.error?.message ?? `Anthropic models API returned status ${response.status}`);
      }
      models.push(...readModelIds(data.data));
      if (!data.has_more) {
        return normalizeModels(models);
      }
      if (!data.last_id || seenCursors.has(data.last_id)) {
        throw new LlmClientError('Anthropic models API returned an invalid pagination cursor');
      }
      afterId = data.last_id;
      seenCursors.add(afterId);
    }
  }

  private createHeaders(includeContentType = true): Record<string, string> {
    return {
      'anthropic-version': '2023-06-01',
      'x-api-key': this.config.apiKey,
      ...(includeContentType ? { 'Content-Type': 'application/json' } : {})
    };
  }
}

async function readModelsResponse(response: Response): Promise<AnthropicModelsResponse> {
  try {
    return (await response.json()) as AnthropicModelsResponse;
  } catch {
    throw new LlmClientError(`Anthropic models API returned an invalid response with status ${response.status}`);
  }
}

function readModelIds(data: Array<{ id?: string }> | undefined): string[] {
  if (!Array.isArray(data)) {
    throw new LlmClientError('Anthropic models API response does not contain a model list');
  }
  return data.map(item => item.id ?? '');
}

function normalizeModels(models: string[]): string[] {
  return [...new Set(models.map(model => model.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function convertMessages(messages: LlmMessage[]): { system: string; messages: AnthropicMessage[] } {
  const system: string[] = [];
  const converted: AnthropicMessage[] = [];
  for (const message of messages) {
    switch (message.role) {
      case 'system':
      case 'developer':
        system.push(toText(message.content));
        break;
      case 'user':
        appendMessage(converted, 'user', [{ type: 'text', text: toText(message.content) }]);
        break;
      case 'assistant': {
        const content: AnthropicContent[] = [];
        const text = toText(message.content);
        if (text) {
          content.push({ type: 'text', text });
        }
        for (const call of message.tool_calls ?? []) {
          if (call.type === 'function') {
            content.push({ type: 'tool_use', id: call.id, name: call.function.name, input: parseJson(call.function.arguments) });
          }
        }
        appendMessage(converted, 'assistant', content);
        break;
      }
      case 'tool':
        appendMessage(converted, 'user', [{ type: 'tool_result', tool_use_id: message.tool_call_id, content: toText(message.content) }]);
        break;
      case 'function':
        appendMessage(converted, 'user', [{ type: 'text', text: toText(message.content) }]);
        break;
    }
  }
  return { system: system.join('\n\n'), messages: converted };
}

function appendMessage(messages: AnthropicMessage[], role: AnthropicMessage['role'], content: AnthropicContent[]): void {
  if (content.length === 0) {
    return;
  }
  const last = messages[messages.length - 1];
  if (last?.role === role) {
    last.content.push(...content);
  } else {
    messages.push({ role, content });
  }
}

function toText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (!Array.isArray(content)) {
    return content === null || content === undefined ? '' : JSON.stringify(content);
  }
  return content
    .map(part => {
      if (typeof part === 'string') {
        return part;
      }
      if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
        return part.text;
      }
      return JSON.stringify(part);
    })
    .join('\n');
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}
