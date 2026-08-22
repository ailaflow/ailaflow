import type { ChatMessage, CompletedChatMessage, LlmMessage } from '@aibindkit/core';
import { Message } from './messages/message';

export interface CompletedChatMessagePointer {
  id: number;
  completedMessageIndex: number;
}

export class ChatSessionStack {
  private readonly stack: ChatMessage[] = [];
  private readonly map = new Map<number, ChatMessage>();

  public push(message: Message) {
    const m: ChatMessage = {
      id: message.id,
      type: message.type
    };
    this.stack.push(m);
    this.map.set(message.id, m);
  }

  public complete(message: Message, completedMessages: CompletedChatMessage[]) {
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

  public tryGetLast(): ChatMessage | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }

  public trySetMetadata(id: number, completedMessageIndex: number, key: string, value: unknown): ChatMessage | null {
    const message = this.map.get(id);
    if (message && message.completedMessages && message.completedMessages.length > completedMessageIndex) {
      let metadata = message.completedMessages[completedMessageIndex].metadata;
      if (!metadata) {
        metadata = {};
        message.completedMessages[completedMessageIndex].metadata = metadata;
      }
      metadata[key] = value;
      return message;
    }
    return null;
  }

  public findByMetadata(key: string, value: unknown): CompletedChatMessagePointer | null {
    for (const message of this.stack) {
      if (message.completedMessages) {
        for (let i = 0; i < message.completedMessages.length; i++) {
          const completedMessage = message.completedMessages[i];
          if (completedMessage.metadata && completedMessage.metadata[key] === value) {
            return { id: message.id, completedMessageIndex: i };
          }
        }
      }
    }
    return null;
  }

  public getCompletedLlmMessagesBeforeLast(): LlmMessage[] {
    const result: LlmMessage[] = [];
    for (let i = 0; i < this.stack.length - 1; i++) {
      const item = this.stack[i];
      if (!item.completedMessages) {
        if (item.failReason || item.isInterrupted) {
          continue;
        }
        throw new Error(`Message ${i} is not completed`);
      }
      for (const c of item.completedMessages) {
        result.push(c.message);
      }
    }
    return result;
  }

  public all(): ReadonlyArray<ChatMessage> {
    return this.stack;
  }

  public isEmpty(): boolean {
    return this.stack.length === 0;
  }

  public load(items: ReadonlyArray<ChatMessage>, start: number, end: number) {
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
