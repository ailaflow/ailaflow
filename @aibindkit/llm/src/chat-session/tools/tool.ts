import type { ToolCall, ToolDescriptor } from '@aibindkit/core';

export interface Tool {
  descriptor: ToolDescriptor;
  execute(abortSignal: AbortSignal, sessionId: string, call: ToolCall): Promise<string>;
}
