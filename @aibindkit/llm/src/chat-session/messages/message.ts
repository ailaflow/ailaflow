import type { MessageMetadata, ToolCall } from '@aibindkit/core';
import type { CompletedMessage } from '@aibindkit/core';
import { MessageType } from '@aibindkit/core';
import { ChatSessionStack } from '../chat-session-stack';

export interface MessageCompletionResult {
  completedMessages: CompletedMessage[];
  toolCalls?: ToolCall[];
  totalTokens?: number;
}

export interface Message {
  id: number;
  type: MessageType;
  metadata?: MessageMetadata;
  complete(abortSignal: AbortSignal, stack: ChatSessionStack): MessageCompletionResult | Promise<MessageCompletionResult>;
  interrupt?(): CompletedMessage;
  fail?(reason: string): CompletedMessage;
}
