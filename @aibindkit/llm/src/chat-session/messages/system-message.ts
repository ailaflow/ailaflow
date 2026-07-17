import type { CompletedMessage } from '@aibindkit/core';
import { MessageType } from '@aibindkit/core';
import { Message, MessageCompletionResult } from './message';

export class SystemMessage implements Message {
  public readonly type = MessageType.SYSTEM;

  public constructor(
    public readonly id: number,
    public readonly content: string
  ) {}

  public async complete(): Promise<MessageCompletionResult> {
    const completedMessage: CompletedMessage = {
      role: 'system',
      content: [
        {
          type: 'text',
          text: this.content
        }
      ]
    };
    return { completedMessages: [completedMessage] };
  }
}
