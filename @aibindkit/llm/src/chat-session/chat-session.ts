import type { MessageChatUpdate, MessageMetadata } from '@aibindkit/core';
import { MessageType, SimpleEvent } from '@aibindkit/core';
import { Message, MessageCompletionResult } from './messages/message';
import { MessageFactory } from './messages/message-factory';
import { ChatSessionStack } from './chat-session-stack';
import { ChatSessionQueue } from './chat-session-queue';
import { ToolContext } from './tools';
import { ChatSessionStorage } from './chat-session-storage';
import { ChatSessionItem } from './chat-session-item';

export interface ChatSessionUpdate {
  isWorking: boolean;
  update: MessageChatUpdate;
}

export class ChatSession {
  public readonly onMessageStarted = new SimpleEvent<ChatSessionUpdate>();
  public readonly onMessageCompleted = new SimpleEvent<ChatSessionUpdate>();
  public readonly onMessageFailed = new SimpleEvent<ChatSessionUpdate>();
  public readonly onReset = new SimpleEvent<void>();
  public readonly onStackStoreError = new SimpleEvent<Error>();

  private interruptAbortController = new AbortController();
  private isWorking = false;
  private isInterrupted = false;
  private lastId = 0;

  private readonly stack = new ChatSessionStack();
  private readonly queue = new ChatSessionQueue();
  private systemMessage?: string;

  private readonly toolContext: ToolContext = {
    sessionId: this.id,
    sessionToken: this.token
  };

  public constructor(
    public readonly id: string,
    public readonly token: string,
    public readonly toolsHash: string,
    private readonly storage: ChatSessionStorage,
    private readonly messageFactory: MessageFactory
  ) {}

  public setSystemMessage(systemMessage: string) {
    this.systemMessage = systemMessage;
  }

  public queueUserMessage(content: string, metadata?: MessageMetadata): number {
    if (this.isInterrupted) {
      this.isInterrupted = false;
      this.interruptAbortController = new AbortController();
    }

    if (this.systemMessage && this.stack.isEmpty() && this.queue.isEmpty()) {
      const systemMessageId = this.nextId();
      const systemMessage = this.messageFactory.createSystem(systemMessageId, this.systemMessage);
      this.queue.push(systemMessage);
    }

    const userMessageId = this.nextId();
    const userMessage = this.messageFactory.createUser(userMessageId, content, metadata);
    this.queue.push(userMessage);
    this.tryNext();
    return userMessageId;
  }

  public tryInterrupt(): boolean {
    if (!this.isWorking || this.isInterrupted) {
      return false;
    }

    this.queue.clear();

    this.isInterrupted = true;
    this.interruptAbortController.abort('User interrupted the session');
    return true;
  }

  public reset() {
    this.tryInterrupt();
    this.queue.clear();
    this.stack.clear();
    this.onReset.emit();
    void this.save();
  }

  public getAll(): MessageChatUpdate[] {
    const all = this.stack.all();
    const result: MessageChatUpdate[] = [];
    for (const item of all) {
      result.push({
        id: item.id,
        type: item.type,
        metadata: item.metadata,
        isInterrupted: item.isInterrupted,
        failReason: item.failReason,
        completedMessages: item.completedMessages
      });
    }
    return result;
  }

  public load(items: ReadonlyArray<ChatSessionItem>) {
    if (items.length === 0) {
      throw new Error('Cannot load an empty session');
    }

    this.stack.clear();
    let start = 0;
    if (this.systemMessage) {
      const index = items.findIndex(item => item.type === MessageType.SYSTEM);
      if (index === 0) {
        const systemMessageId = items[0].id;
        const systemMessage = this.messageFactory.createSystem(systemMessageId, this.systemMessage);
        this.stack.push(systemMessage);
        const result = systemMessage.complete();
        this.stack.complete(systemMessage, result.completedMessages);
        start = 1;
      }
    }
    this.stack.load(items, start, items.length);
    this.lastId = items[items.length - 1].id;
  }

  public dump(): ReadonlyArray<ChatSessionItem> {
    return this.stack.all();
  }

  /**
   * The save operation is best-effort, and errors are emitted via the onStackStoreError event.
   */
  private async save() {
    try {
      const abortSignal = AbortSignal.timeout(3_000);
      await this.storage.save(abortSignal, this.id, this.dump());
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      this.onStackStoreError.emit(error);
    }
  }

  private tryNext() {
    if (this.isWorking) {
      return null;
    }

    const last = this.stack.tryGetLast();
    let message: Message;
    if (last && last.type === MessageType.TOOL) {
      message = this.messageFactory.createAi(this.nextId());
    } else {
      const nextMessage = this.queue.shift();
      if (nextMessage) {
        message = nextMessage;
      } else {
        const isLastAi = last?.type === MessageType.AI;
        if (isLastAi) {
          return false;
        }
        message = this.messageFactory.createAi(this.nextId());
      }
    }

    this.stack.push(message);
    this.isWorking = true;
    setTimeout(() => this.next(message), 0);
    return true;
  }

  private async next(message: Message) {
    void this.save();

    let lastMetadata = message.metadata;
    this.onMessageStarted.emit({
      isWorking: true,
      update: {
        id: message.id,
        type: message.type,
        metadata: lastMetadata
      }
    });

    const interruptSignal = this.interruptAbortController.signal;
    let result: MessageCompletionResult;
    try {
      interruptSignal.throwIfAborted();
      result = await message.complete(interruptSignal, this.stack);
    } catch (e) {
      const failReason = (e as Error)?.message ?? String(e);
      const isInterrupted = interruptSignal.aborted;

      if (isInterrupted) {
        this.stack.interrupt(message);
      } else {
        this.stack.fail(message, failReason);
      }
      void this.save();

      // TODO: we should probably restore user messages in UI here, that a user won't lose their input if the session fails.
      this.queue.clear();

      this.onMessageFailed.emit({
        isWorking: false,
        update: {
          id: message.id,
          isInterrupted: isInterrupted ? true : undefined,
          failReason: isInterrupted ? undefined : failReason
        }
      });

      console.error('Error completing message:', failReason);
      return;
    } finally {
      this.isWorking = false;
    }

    this.stack.complete(message, result.completedMessages);
    void this.save();

    if (result.toolCalls) {
      const tid = this.nextId();
      const toolMessage = this.messageFactory.createTool(tid, this.toolContext, result.toolCalls);
      this.queue.pushAfterType(toolMessage, MessageType.TOOL);
    }

    const hasNext = this.tryNext();
    const completeUpdate: MessageChatUpdate = {
      id: message.id,
      completedMessages: result.completedMessages
    };
    if (lastMetadata !== message.metadata) {
      completeUpdate.metadata = message.metadata;
    }
    this.onMessageCompleted.emit({
      isWorking: hasNext === true,
      update: completeUpdate
    });
  }

  private nextId(): number {
    return ++this.lastId;
  }
}
