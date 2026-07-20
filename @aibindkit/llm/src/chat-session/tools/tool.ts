import type { ToolCall, ToolDescriptor } from '@aibindkit/core';

export interface Tool {
  descriptor: ToolDescriptor;
  execute(abortSignal: AbortSignal, call: ToolCall, chatSessionId: string): Promise<string>;
}
