import type { ToolCall } from '@aibindkit/core';
import type { CompletedMessage } from '@aibindkit/core';
import { MessageType } from '@aibindkit/core';
import { SessionStack } from '../session-stack';

export interface MessageCompleteResult {
  completedMessage: CompletedMessage | CompletedMessage[];
  toolCalls?: ToolCall[];
  totalTokens?: number;
}

export interface Message {
  id: number;
  type: MessageType;
  complete(abortSignal: AbortSignal, stack: SessionStack): Promise<MessageCompleteResult>;
}
