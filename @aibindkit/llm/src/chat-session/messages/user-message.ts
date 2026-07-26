import { ChatMessageMetadata, ChatMessageType, type LlmMessage } from '@aibindkit/core';
import { Message, MessageCompletionResult } from './message';

export class UserMessage implements Message {
  public readonly type = ChatMessageType.USER;

  public constructor(
    public readonly id: number,
    public readonly text: string,
    public readonly metadata?: ChatMessageMetadata
  ) {}

  public complete(): MessageCompletionResult {
    const message: LlmMessage = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: this.text
        }
      ]
    };
    return { completedMessages: [{ message, metadata: this.metadata }] };
  }
}
