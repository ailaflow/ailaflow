import { CompletedMessage } from '../../llm-client/types/completed-message';
import { CompleteResult, Message, MessageType } from './message';

export class SystemMessage implements Message {
  public readonly type = MessageType.USER;

  public constructor(public readonly content: string) {}

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
