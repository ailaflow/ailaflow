import type { ChatMessageUpdate, ChatMessageMetadata, ChatMessage, ChatContextUsageUpdate } from '@aibindkit/core';
import { ChatMessageType, SimpleEvent } from '@aibindkit/core';
import { Message, MessageCompletionResult } from './messages/message';
import { MessageFactory } from './messages/message-factory';
import { ChatSessionStack, CompletedChatMessagePointer } from './chat-session-stack';
import { ChatSessionQueue } from './chat-session-queue';
import { ToolContext } from './tools';
import { ChatSessionStorage } from './chat-session-storage';

export interface ChatSessionUpdate {
  isWorking?: boolean;
  contextUsage?: ChatContextUsageUpdate;
  update: ChatMessageUpdate;
}

export interface ChatSessionSnapshot {
  readonly totalTokens?: number;
  readonly messages: ReadonlyArray<ChatMessage>;
}

export class ChatSession {
  public readonly onMessageStarted = new SimpleEvent<ChatSessionUpdate>();
  public readonly onMessageCompleted = new SimpleEvent<ChatSessionUpdate>();
  public readonly onMessageFailed = new SimpleEvent<ChatSessionUpdate>();
  public readonly onReset = new SimpleEvent<void>();
  public readonly onStackStoreError = new SimpleEvent<Error>();
  public readonly onDestroyed = new SimpleEvent<void>();

  private interruptAbortController = new AbortController();
  private isWorking = false;
  private isInterrupted = false;
  private isDestroyed = false;
  private lastId = 0;

  private readonly stack = new ChatSessionStack();
  private readonly queue = new ChatSessionQueue();
  private systemMessage?: string;
  private contextUsage: ChatContextUsageUpdate = this.calcContextUsage();

  private readonly toolContext: ToolContext = {
    sessionId: this.id,
    sessionToken: this.token
  };

  public constructor(
    public readonly id: string,
    public readonly token: string,
    public readonly toolsHash: string,
    private readonly contextWindow: number | undefined,
    private readonly effectiveContextWindowPercent: number,
    private readonly storage: ChatSessionStorage,
    private readonly messageFactory: MessageFactory
  ) {}

  public setSystemMessage(systemMessage: string) {
    this.systemMessage = systemMessage;
  }

  public async setMetadata(id: number, completedMessageIndex: number, key: string, value: unknown) {
    if (this.isDestroyed) {
      throw new Error('Session is destroyed');
    }

    const message = this.stack.trySetMetadata(id, completedMessageIndex, key, value);
    if (!message) {
      throw new Error(`Cannot find message with id ${id} at completed message index ${completedMessageIndex}.`);
    }
    this.onMessageCompleted.emit({
      update: {
        id,
        completedMessages: message.completedMessages
      }
    });
    await this.save();
  }

  public findByMetadata(key: string, value: unknown): CompletedChatMessagePointer | null {
    return this.stack.findByMetadata(key, value);
  }

  public queueUserMessage(content: string, metadata?: ChatMessageMetadata): number {
    if (this.isDestroyed) {
      throw new Error('Session is destroyed');
    }

    if (this.effectiveContextWindowPercent <= this.contextUsage.percent) {
      // TODO: we should replace this by compacting the session
      throw new Error('Context window exceeded, please reset the session');
    }

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

  public async reset() {
    this.tryInterrupt();
    this.queue.clear();
    this.stack.clear();
    this.onReset.emit();
    await this.save();
  }

  public getAll(): ChatMessage[] {
    const all = this.stack.all();
    const result: ChatMessage[] = [];
    for (const item of all) {
      result.push({
        id: item.id,
        type: item.type,
        isInterrupted: item.isInterrupted,
        failReason: item.failReason,
        completedMessages: item.completedMessages
      });
    }
    return result;
  }

  public getContextUsage(): ChatContextUsageUpdate {
    return this.contextUsage;
  }

  public import(snapshot: ChatSessionSnapshot) {
    const messages = snapshot.messages;
    if (messages.length === 0) {
      throw new Error('Cannot load an empty session');
    }

    this.stack.clear();
    let start = 0;
    if (this.systemMessage) {
      const index = messages.findIndex(item => item.type === ChatMessageType.SYSTEM);
      if (index === 0) {
        const systemMessageId = messages[0].id;
        const systemMessage = this.messageFactory.createSystem(systemMessageId, this.systemMessage);
        this.stack.push(systemMessage);
        const result = systemMessage.complete();
        this.stack.complete(systemMessage, result.completedMessages);
        start = 1;
      }
    }
    this.stack.load(messages, start, messages.length);
    this.lastId = messages[messages.length - 1].id;
    this.contextUsage = this.calcContextUsage(snapshot.totalTokens);
  }

  public export(): ChatSessionSnapshot {
    return {
      totalTokens: this.contextUsage.totalTokens,
      messages: this.stack.all()
    };
  }

  public destroy() {
    if (this.isDestroyed) {
      throw new Error('Session is already destroyed');
    }
    this.isDestroyed = true;
    this.tryInterrupt();
    this.onDestroyed.emit();
  }

  /**
   * The save operation is best-effort, and errors are emitted via the onStackStoreError event.
   */
  private async trySave() {
    try {
      await this.save();
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      this.onStackStoreError.emit(error);
    }
  }

  private async save() {
    const abortSignal = AbortSignal.timeout(3_000);
    await this.storage.save(abortSignal, this.id, this.export());
  }

  private tryNext() {
    if (this.isWorking) {
      return null;
    }

    const last = this.stack.tryGetLast();
    let message: Message;
    if (last && last.type === ChatMessageType.TOOL) {
      message = this.messageFactory.createAi(this.nextId());
    } else {
      const nextMessage = this.queue.shift();
      if (nextMessage) {
        message = nextMessage;
      } else {
        const isLastAi = last?.type === ChatMessageType.AI;
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
    await this.trySave();

    this.onMessageStarted.emit({
      isWorking: true,
      update: {
        id: message.id,
        type: message.type
      }
    });

    const interruptSignal = this.interruptAbortController.signal;
    let result: MessageCompletionResult;
    try {
      interruptSignal.throwIfAborted();
      result = await message.complete(interruptSignal, this.stack);
    } catch (e) {
      if (this.isDestroyed) {
        return;
      }

      const failReason = (e as Error)?.message ?? String(e);
      const isInterrupted = interruptSignal.aborted;
      if (isInterrupted) {
        this.stack.interrupt(message);
      } else {
        this.stack.fail(message, failReason);
      }
      await this.trySave();

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

    this.contextUsage = this.calcContextUsage(result.usage?.total_tokens);
    this.stack.complete(message, result.completedMessages);
    await this.trySave();

    if (result.toolCalls) {
      const tid = this.nextId();
      const toolMessage = this.messageFactory.createTool(tid, this.toolContext, result.toolCalls);
      this.queue.pushAfterType(toolMessage, ChatMessageType.TOOL);
    }

    const hasNext = this.tryNext();
    this.onMessageCompleted.emit({
      isWorking: hasNext === true,
      contextUsage: this.contextUsage,
      update: {
        id: message.id,
        completedMessages: result.completedMessages
      }
    });
  }

  private nextId(): number {
    return ++this.lastId;
  }

  private calcContextUsage(totalTokens?: number): ChatContextUsageUpdate {
    let percent = 0;
    if (totalTokens !== undefined && this.contextWindow !== undefined) {
      percent = Math.min(1, Math.max(0, totalTokens / this.contextWindow)) * 100;
    }
    return {
      percent,
      totalTokens,
      contextWindow: this.contextWindow
    };
  }
}
