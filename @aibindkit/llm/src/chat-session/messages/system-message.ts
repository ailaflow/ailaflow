import { ChatMessageType, LlmMessage } from '@aibindkit/core';
import { Message, MessageCompletionResult } from './message';

export class SystemMessage implements Message {
  public readonly type = ChatMessageType.SYSTEM;

  public constructor(
    public readonly id: number,
    public readonly content: string
  ) {}

  public complete(): MessageCompletionResult {
    const message: LlmMessage = {
      role: 'system',
      content: [
        {
          type: 'text',
          text: this.content
        }
      ]
    };
    return { completedMessages: [{ message }] };
  }
}
