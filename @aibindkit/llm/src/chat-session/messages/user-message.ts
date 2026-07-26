import type { CompletedMessage, MessageMetadata } from '@aibindkit/core';
import { MessageType } from '@aibindkit/core';
import { Message, MessageCompletionResult } from './message';

export class UserMessage implements Message {
  public readonly type = MessageType.USER;

  public constructor(
    public readonly id: number,
    public readonly text: string,
    public readonly metadata?: MessageMetadata
  ) {}

  public complete(): MessageCompletionResult {
    const completedMessage: CompletedMessage = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: this.text
        }
      ]
    };
    return { completedMessages: [completedMessage] };
  }
}
