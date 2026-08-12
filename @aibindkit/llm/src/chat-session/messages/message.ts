import type { ChatMessageType, CompletedChatMessage, LlmCompletionUsage, ToolCall } from '@aibindkit/core';
import { ChatSessionStack } from '../chat-session-stack';

export interface MessageCompletionResult {
  completedMessages: CompletedChatMessage[];
  toolCalls?: ToolCall[];
  usage?: LlmCompletionUsage;
}

export interface Message {
  id: number;
  type: ChatMessageType;
  complete(abortSignal: AbortSignal, stack: ChatSessionStack): MessageCompletionResult | Promise<MessageCompletionResult>;
  interrupt?(): CompletedChatMessage;
  fail?(reason: string): CompletedChatMessage;
}
