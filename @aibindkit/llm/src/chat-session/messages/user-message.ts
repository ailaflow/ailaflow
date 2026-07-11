import type { CompletedMessage } from '@aibindkit/model';
import { MessageType } from '@aibindkit/model';
import { Message, MessageCompleteResult } from './message';

export class UserMessage implements Message {
  public readonly type = MessageType.USER;

  public constructor(
    public readonly id: number,
    public readonly text: string
  ) {}

  public async complete(): Promise<MessageCompleteResult> {
    const completedMessage: CompletedMessage = {
      role: 'user',
      content: [
        {
          type: 'text',
          text: this.text
        }
      ]
    };
    return { completedMessage };
  }
}
