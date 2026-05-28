import { CompletedMessage, MessageType } from '@aila/model';
import { CompleteResult, Message } from './message';

export class SystemMessage implements Message {
  public readonly type = MessageType.SYSTEM;

  public constructor(
    public readonly id: number,
    public readonly content: string
  ) {}

  public async complete(): Promise<CompleteResult> {
    const completedMessage: CompletedMessage = {
      role: 'system',
      content: [
        {
          type: 'text',
          text: this.content
        }
      ]
    };
    return { completedMessage };
  }
}
