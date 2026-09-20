import { ChatMessageType, type ChatMessage, type CompletedChatMessage, type LlmMessage } from '@aibindkit/core';
import { Message } from './messages/message';

export interface CompletedChatMessagePointer {
  id: number;
  completedMessageIndex: number;
}

export interface PendingChatMessage {
  message: Message;
  complete(completedMessages: CompletedChatMessage[]): void;
  fail(reason: string): void;
  interrupt(): void;
}

const MAX_HISTORICAL_ITEMS = 60;

export class ChatSessionStack {
  private systemMessage?: LlmMessage;

  private readonly historicalStack: ChatMessage[] = [];
  private readonly recentStack: ChatMessage[] = [];
  private readonly recentMap = new Map<number, ChatMessage>();

  public setSystemMessage(systemMessage: LlmMessage) {
    this.systemMessage = systemMessage;
  }

  public push(message: Message): PendingChatMessage {
    if (message.type === ChatMessageType.SYSTEM) {
      throw new Error('Cannot push system message');
    }

    const m: ChatMessage = {
      id: message.id,
      type: message.type
    };
    this.recentStack.push(m);
    this.recentMap.set(message.id, m);

    return {
      message,
      complete: (completedMessages: CompletedChatMessage[]) => {
        m.completedMessages = completedMessages;
        if (message.type === ChatMessageType.COMPACT) {
          this.tryCompact();
        }
      },
      fail: (reason: string) => {
        m.failReason = reason;
        if (message.fail) {
          m.completedMessages = [message.fail(reason)];
        }
      },
      interrupt: () => {
        m.isInterrupted = true;
        if (message.interrupt) {
          m.completedMessages = [message.interrupt()];
        }
      }
    };
  }

  public tryGetType(type: ChatMessageType): ChatMessage | null {
    for (let i = this.recentStack.length - 1; i >= 0; i--) {
      const message = this.recentStack[i];
      if (message.type === type) {
        return message;
      }
    }
    return null;
  }

  public tryGetLast(): ChatMessage | null {
    return this.recentStack.length > 0 ? this.recentStack[this.recentStack.length - 1] : null;
  }

  public trySetMetadata(pointer: CompletedChatMessagePointer, key: string, value: unknown): ChatMessage | null {
    let message = this.recentMap.get(pointer.id);
    if (!message) {
      message = this.historicalStack.find(m => m.id === pointer.id);
    }
    if (message && message.completedMessages && message.completedMessages.length > pointer.completedMessageIndex) {
      let metadata = message.completedMessages[pointer.completedMessageIndex].metadata;
      if (!metadata) {
        metadata = {};
        message.completedMessages[pointer.completedMessageIndex].metadata = metadata;
      }
      metadata[key] = value;
      return message;
    }
    return null;
  }

  public findByMetadata(key: string, value: unknown): CompletedChatMessagePointer | null {
    for (const message of this.recentStack) {
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

  public getRecentCompletedLlmMessagesBeforeLast(): LlmMessage[] {
    const result: LlmMessage[] = [];
    if (this.systemMessage) {
      result.push(this.systemMessage);
    }

    for (let i = 0; i < this.recentStack.length - 1; i++) {
      const item = this.recentStack[i];
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

  public getHistoricalStack(): ReadonlyArray<ChatMessage> {
    return this.historicalStack;
  }

  public getRecentStack(): ReadonlyArray<ChatMessage> {
    return this.recentStack;
  }

  public isRecentEmpty(): boolean {
    return this.recentStack.length === 0;
  }

  public load(items: ReadonlyArray<ChatMessage>, start: number, end: number) {
    for (let i = start; i < end; i++) {
      const item = items[i];
      this.recentStack.push(item);
      this.recentMap.set(item.id, item);
    }
    this.tryCompact();
  }

  public clear() {
    this.historicalStack.length = 0;
    this.recentStack.length = 0;
    this.recentMap.clear();
  }

  private tryCompact() {
    let lastIndex = -1;
    for (let i = this.recentStack.length - 1; i >= 0; i--) {
      const item = this.recentStack[i];
      if (item.type === ChatMessageType.COMPACT && item.completedMessages && !item.failReason && !item.isInterrupted) {
        lastIndex = i;
        break;
      }
    }

    if (lastIndex <= 0) {
      return;
    }

    const omitted = this.recentStack.splice(0, lastIndex);
    for (const item of omitted) {
      this.recentMap.delete(item.id);
    }
    this.historicalStack.push(...omitted);

    if (this.historicalStack.length > MAX_HISTORICAL_ITEMS) {
      this.historicalStack.splice(0, this.historicalStack.length - MAX_HISTORICAL_ITEMS);
    }
  }
}
