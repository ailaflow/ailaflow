import type { LlmMessage, ToolDescriptor } from '@aibindkit/core';
import { LlmClientError } from '../llm-client';
import type { CodexDynamicToolSpec, CodexJsonValue } from './codex-protocol';

export function findLatestCodexThreadId(messages: LlmMessage[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    const threadId = tryReadCodexThreadId(message);
    if (threadId) {
      return threadId;
    }
  }
  return undefined;
}

export function readDeveloperInstructions(messages: LlmMessage[]): string {
  return messages
    .filter(message => message.role === 'system' || message.role === 'developer')
    .map(message => readMessageText(message))
    .filter(Boolean)
    .join('\n\n');
}

export function readLatestUserInput(messages: LlmMessage[]): { index: number; text: string } {
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message.role === 'user') {
      const text = readMessageText(message);
      if (!text) {
        throw new LlmClientError('Codex app-server does not support an empty user message');
      }
      return { index, text };
    }
  }
  throw new LlmClientError('Codex app-server completion requires a user message');
}

export function projectHistory(messages: LlmMessage[], endExclusive: number): CodexJsonValue[] {
  const items: CodexJsonValue[] = [];
  for (let index = 0; index < endExclusive; index++) {
    const message = messages[index];
    switch (message.role) {
      case 'system':
      case 'developer':
        break;
      case 'user': {
        const text = readMessageText(message);
        if (text) {
          items.push({ type: 'message', role: 'user', content: [{ type: 'input_text', text }] });
        }
        break;
      }
      case 'assistant': {
        const text = readMessageText(message);
        if (text) {
          items.push({ type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] });
        }
        for (const call of message.tool_calls ?? []) {
          if (call.type === 'function') {
            items.push({
              type: 'function_call',
              call_id: call.id,
              name: call.function.name,
              arguments: normalizeJsonArguments(call.function.arguments)
            });
          }
        }
        break;
      }
      case 'tool':
        items.push({
          type: 'function_call_output',
          call_id: message.tool_call_id,
          output: readMessageText(message)
        });
        break;
      case 'function': {
        const text = readMessageText(message);
        if (text) {
          items.push({ type: 'message', role: 'user', content: [{ type: 'input_text', text }] });
        }
        break;
      }
    }
  }
  return items;
}

export function mapDynamicTools(toolDescriptors: ToolDescriptor[] | undefined): CodexDynamicToolSpec[] {
  return (toolDescriptors ?? []).map(tool => ({
    type: 'function',
    name: tool.function.name,
    description: tool.function.description ?? '',
    inputSchema: toJsonValue(tool.function.parameters ?? { type: 'object', properties: {} })
  }));
}

export function dynamicToolsFingerprint(tools: CodexDynamicToolSpec[]): string {
  return JSON.stringify(
    [...tools]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }))
  );
}

export function readToolResults(messages: LlmMessage[], threadId: string): Array<{ callId: string; content: string }> {
  let markerIndex = -1;
  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (message.role === 'assistant' && tryReadCodexThreadId(message) === threadId) {
      markerIndex = index;
      break;
    }
  }
  if (markerIndex < 0) {
    return [];
  }
  return messages
    .slice(markerIndex + 1)
    .flatMap(message => (message.role === 'tool' ? [{ callId: message.tool_call_id, content: readMessageText(message) }] : []));
}

export function withCodexThreadId(message: LlmMessage, threadId: string): LlmMessage {
  return Object.assign(message, { codexThreadId: threadId });
}

function tryReadCodexThreadId(message: LlmMessage): string | undefined {
  if (message.role !== 'assistant' || !('codexThreadId' in message)) {
    return undefined;
  }
  const threadId = message.codexThreadId;
  return typeof threadId === 'string' && threadId.length > 0 ? threadId : undefined;
}

function readMessageText(message: LlmMessage): string {
  const content = 'content' in message ? message.content : undefined;
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
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function normalizeJsonArguments(value: string): string {
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {});
  } catch {
    return '{}';
  }
}

function toJsonValue(value: unknown): CodexJsonValue {
  try {
    return JSON.parse(JSON.stringify(value)) as CodexJsonValue;
  } catch {
    throw new LlmClientError('Codex dynamic tool schema is not JSON serializable');
  }
}
