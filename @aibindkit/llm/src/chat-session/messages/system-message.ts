import type { CompletedMessage } from '@aibindkit/model';
import { MessageType } from '@aibindkit/model';
import { Message, MessageCompleteResult } from './message';

export class SystemMessage implements Message {
  public readonly type = MessageType.SYSTEM;

  public constructor(
    public readonly id: number,
    public readonly content: string
  ) {}

  public async complete(): Promise<MessageCompleteResult> {
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
