import { CompletedMessage, MessageMetadata, MessageType } from '@aibindkit/core';

export interface ChatSessionItem {
  id: number;
  type: MessageType;
  metadata?: MessageMetadata;
  completedMessages?: CompletedMessage[];
  failReason?: string;
  isInterrupted?: true;
}
