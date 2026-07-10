import type { ToolCall } from '@aibindkit/model';
import { CompletedMessage, MessageType } from '@aila/model';
import { SessionStack } from '../session-stack';

export interface CompleteResult {
  completedMessage: CompletedMessage | CompletedMessage[];
  toolCalls?: ToolCall[];
  totalTokens?: number;
}

export interface Message {
  id: number;
  type: MessageType;
  complete(abortSignal: AbortSignal, stack: SessionStack): Promise<CompleteResult>;
}
