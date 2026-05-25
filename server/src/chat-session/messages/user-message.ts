import { CompletedMessage } from '../../llm-client/types/completed-message';
import { CompleteResult, Message, MessageType } from './message';

export class UserMessage implements Message {
  public readonly type = MessageType.USER;

  public constructor(public readonly text: string) {}

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
