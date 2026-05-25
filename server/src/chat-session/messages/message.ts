import { SessionStack } from '../session-stack';
import { CompletedMessage } from '../../llm-client/types/completed-message';
import { ToolCall } from '../../llm-client/types/tool-call';

export enum MessageType {
  AI,
  TOOL,
  USER,
  SYSTEM
}

export interface CompleteResult {
  completedMessage: CompletedMessage | CompletedMessage[];
  toolCalls?: ToolCall[];
  totalTokens?: number;
}

export interface Message {
  type: MessageType;
  complete(abortSignal: AbortSignal, stack: SessionStack): Promise<CompleteResult>;
}
