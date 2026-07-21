import type { ToolCall, ToolDescriptor } from '@aibindkit/core';

export interface ToolContext {
  sessionId: string;
  sessionToken: string;
}

export interface Tool {
  descriptor: ToolDescriptor;
  execute(abortSignal: AbortSignal, context: ToolContext, call: ToolCall): Promise<string>;
}
