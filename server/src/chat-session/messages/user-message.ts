import { CompletedMessage, MessageType } from '@aila/model';
import { CompleteResult, Message } from './message';

export class UserMessage implements Message {
  public readonly type = MessageType.USER;

  public constructor(
    public readonly id: number,
    public readonly text: string
  ) {}

  public async complete(): Promise<CompleteResult> {
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
