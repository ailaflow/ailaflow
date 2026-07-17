import type { CompletedMessage } from '@aibindkit/core';
import { Message } from './messages/message';

export interface SessionStackItem {
  message: Message;
  completedMessages?: CompletedMessage[];
  failReason?: string;
  isInterrupted?: true;
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

  public complete(message: Message, completedMessages: CompletedMessage[]) {
    const item = this.map.get(message);
    if (!item) {
      throw new Error('Cannot find message');
    }
    item.completedMessages = completedMessages;
  }

  public fail(message: Message, reason: string) {
    const item = this.map.get(message);
    if (!item) {
      throw new Error('Cannot find message');
    }
    item.failReason = reason;
    if (message.fail) {
      item.completedMessages = [message.fail(reason)];
    }
  }

  public interrupt(message: Message) {
    const item = this.map.get(message);
    if (!item) {
      throw new Error('Cannot find message');
    }
    item.isInterrupted = true;
    if (message.interrupt) {
      item.completedMessages = [message.interrupt()];
    }
  }

  public tryGetLast(): SessionStackItem | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  public getCompletedMessagesBeforeLast(): CompletedMessage[] {
    const result: CompletedMessage[] = [];
    for (let i = 0; i < this.stack.length - 1; i++) {
      const item = this.stack[i];
      if (!item.completedMessages) {
        if (item.failReason || item.isInterrupted) {
          continue;
        }
        throw new Error(`Message ${i} is not completed`);
      }
      result.push(...item.completedMessages);
    }
    return result;
  }

  public all(): ReadonlyArray<SessionStackItem> {
    return this.stack;
  }

  public isEmpty(): boolean {
    return this.stack.length === 0;
  }

  public clear() {
    this.stack.length = 0;
    this.map.clear();
  }
}
