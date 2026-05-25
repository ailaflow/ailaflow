import { Message } from './messages/message';
import { CompletedMessage } from '../llm-client/types/completed-message';

export interface SessionStackItem {
  message: Message;
  completedMessage?: CompletedMessage;
  failed?: string;
}

export class SessionStack {
  private readonly stack: SessionStackItem[] = [];
  private readonly map = new Map<Message, SessionStackItem>();

  public push(message: Message): void {
    const item: SessionStackItem = {
      message
    };
    this.stack.push(item);
    this.map.set(message, item);
  }

  public complete(message: Message, completedMessage: CompletedMessage | CompletedMessage[]) {
    const item = this.map.get(message);
    if (!item) {
      throw new Error('Cannot find message');
    }
    if (Array.isArray(completedMessage)) {
      item.completedMessage = completedMessage[0];
      let lastItem: SessionStackItem | null = null;
      for (let i = 1; i < completedMessage.length; i++) {
        lastItem = {
          message: item.message,
          completedMessage: completedMessage[i]
        };
        this.stack.push(lastItem);
      }
      if (lastItem) {
        this.map.set(message, lastItem);
      }
    } else {
      item.completedMessage = completedMessage;
    }
  }

  public fail(message: Message, error: string) {
    const item = this.map.get(message);
    if (!item) {
      throw new Error('Cannot find message');
    }
    item.failed = error;
  }

  public tryGetLast(): SessionStackItem | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  public getCompletedMessagesBeforeLast(): CompletedMessage[] {
    const result: CompletedMessage[] = [];
    for (let i = 0; i < this.stack.length - 1; i++) {
      const item = this.stack[i];
      if (!item.completedMessage) {
        if (item.failed) {
          continue;
        }
        throw new Error(`Message ${i} is not completed`);
      }
      result.push(item.completedMessage);
    }
    return result;
  }
}
