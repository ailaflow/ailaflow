import type { ToolCall } from '@aibindkit/model';
import type { CompletedMessage } from '@aibindkit/model';
import { MessageType } from '@aibindkit/model';
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
