import type { CompletedMessage } from '@aibindkit/core';
import { Message } from './messages/message';
import { ChatSessionItem } from './chat-session-item';

export class ChatSessionStack {
  private readonly stack: ChatSessionItem[] = [];
  private readonly map = new Map<number, ChatSessionItem>();

  public push(message: Message): void {
    const item: ChatSessionItem = {
      id: message.id,
      type: message.type,
      metadata: message.metadata
    };
    this.stack.push(item);
    this.map.set(message.id, item);
  }

  public complete(message: Message, completedMessages: CompletedMessage[]) {
    const item = this.map.get(message.id);
    if (!item) {
      throw new Error('Cannot find message');
    }
    item.completedMessages = completedMessages;
  }

  public fail(message: Message, reason: string) {
    const item = this.map.get(message.id);
    if (!item) {
      throw new Error('Cannot find message');
    }
    item.failReason = reason;
    if (message.fail) {
      item.completedMessages = [message.fail(reason)];
    }
  }

  public interrupt(message: Message) {
    const item = this.map.get(message.id);
    if (!item) {
      throw new Error('Cannot find message');
    }
    item.isInterrupted = true;
    if (message.interrupt) {
      item.completedMessages = [message.interrupt()];
    }
  }

  public tryGetLast(): ChatSessionItem | null {
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

  public all(): ReadonlyArray<ChatSessionItem> {
    return this.stack;
  }

  public isEmpty(): boolean {
    return this.stack.length === 0;
  }

  public load(items: ReadonlyArray<ChatSessionItem>, start: number, end: number) {
    for (let i = start; i < end; i++) {
      const item = items[i];
      this.stack.push(item);
      this.map.set(item.id, item);
    }
  }

  public clear() {
    this.stack.length = 0;
    this.map.clear();
  }
}
