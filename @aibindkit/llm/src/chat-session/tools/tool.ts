import type { ChatMessageMetadata, ToolCall, ToolDescriptor } from '@aibindkit/core';

export interface ToolContext {
  sessionId: string;
  sessionToken: string;
}

export interface ToolExecutionResult {
  content: string;
  metadata?: ChatMessageMetadata;
}

export interface Tool {
  descriptor: ToolDescriptor;
  execute(signal: AbortSignal, context: ToolContext, call: ToolCall): Promise<ToolExecutionResult>;
}
