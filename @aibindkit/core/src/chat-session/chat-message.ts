import { LlmMessage } from './llm-message';
import { ChatMessageType } from './chat-message-type';

export interface ChatMessage {
  id: number;
  type: ChatMessageType;
  completedMessages?: CompletedChatMessage[];
  failReason?: string;
  isInterrupted?: true;
}

export type ChatMessageMetadata = Record<string, unknown>;

export interface CompletedChatMessage {
  message: LlmMessage;
  metadata?: ChatMessageMetadata;
}
