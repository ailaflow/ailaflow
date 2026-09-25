import type { ChatMessageUpdate, ChatMessageMetadata, ChatMessage, ChatContextUsageUpdate, Logger } from '@aibindkit/core';
import { ChatMessageType, SimpleEvent } from '@aibindkit/core';
import { Message, MessageCompletionResult } from './messages/message';
import { MessageFactory } from './messages/message-factory';
import { PendingChatMessage, ChatSessionStack, CompletedChatMessagePointer } from './chat-session-stack';
import { ChatSessionQueue } from './chat-session-queue';
import { ToolContext } from './tools';
import { ChatSessionStorage } from './chat-session-storage';
import { UserMessageAction, UserMessageActionParser } from './messages';

export interface ChatSessionUpdate {
  isWorking?: boolean;
  contextUsage?: ChatContextUsageUpdate;
  update: ChatMessageUpdate;
}

export interface ChatSessionSnapshot {
  readonly totalTokens?: number;
  readonly messages: ReadonlyArray<ChatMessage>;
}

const SYSTEM_MESSAGE_ID = -1;

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
    private readonly logger: Logger,
    private readonly storage: ChatSessionStorage,
    private readonly messageFactory: MessageFactory
  ) {}

  public setSystemMessage(systemMessage: string) {
    const message = this.messageFactory.createSystem(SYSTEM_MESSAGE_ID, systemMessage);
    const result = message.complete();
    this.stack.setSystemMessage(result.completedMessages[0].message);
  }

  public async setMetadata(signal: AbortSignal, pointer: CompletedChatMessagePointer, key: string, value: unknown) {
    if (this.isDestroyed) {
      throw new Error('Session is destroyed');
    }

    const message = this.stack.trySetMetadata(pointer, key, value);
    if (!message) {
      throw new Error(`Cannot find message with id ${pointer.id} at completed message index ${pointer.completedMessageIndex}`);
    }

    this.onMessageCompleted.emit({
      update: {
        id: pointer.id,
        completedMessages: message.completedMessages
      }
    });
    await this.save(signal);
  }

  public findByMetadata(key: string, value: unknown): CompletedChatMessagePointer | null {
    return this.stack.findByMetadata(key, value);
  }

  public queueUserMessage(content: string, metadata?: ChatMessageMetadata): number {
    if (this.isDestroyed) {
      throw new Error('Session is destroyed');
    }

    if (this.isInterrupted) {
      this.isInterrupted = false;
      this.interruptAbortController = new AbortController();
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
    this.interruptAbortController.abort(`The user interrupted session ${this.id}`);
    return true;
  }

  public async reset(signal: AbortSignal) {
    this.tryInterrupt();
    await this.resetAndSave(signal);
  }

  public getAll(): ChatMessage[] {
    return [...this.stack.getHistoricalStack(), ...this.stack.getRecentStack()];
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
    this.stack.load(messages, 0, messages.length);
    this.lastId = messages[messages.length - 1].id;
    this.contextUsage = this.calcContextUsage(snapshot.totalTokens);
  }

  public export(): ChatSessionSnapshot {
    return {
      totalTokens: this.contextUsage.totalTokens,
      messages: this.getAll()
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
  private async maybeSave() {
    try {
      const signal = AbortSignal.timeout(3_000);
      await this.save(signal);
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      this.onStackStoreError.emit(error);
    }
  }

  private async save(signal: AbortSignal) {
    await this.storage.save(signal, this.id, this.export());
  }

  private async resetAndSave(signal: AbortSignal) {
    this.queue.clear();
    this.stack.clear();
    this.onReset.emit();
    await this.save(signal);
  }

  private tryGetNextJob(): Message | UserMessageAction.RESET | null {
    const last = this.stack.tryGetLast();
    if (last && last.type === ChatMessageType.TOOL) {
      return this.messageFactory.createAssistant(this.nextId());
    }

    const next = this.queue.peek();
    if (next && next.type === ChatMessageType.TOOL) {
      this.queue.shift();
      return next;
    }

    if (this.effectiveContextWindowPercent <= this.contextUsage.percent) {
      return this.messageFactory.createCompact(this.nextId());
    }

    if (next) {
      this.queue.shift();
      const action = UserMessageActionParser.tryParse(next);
      if (action === UserMessageAction.COMPACT) {
        return this.messageFactory.createCompact(this.nextId());
      }
      if (action === UserMessageAction.RESET) {
        return UserMessageAction.RESET;
      }
      return next;
    }
    const isLastAi = last?.type === ChatMessageType.ASSISTANT;
    if (isLastAi) {
      return null;
    }
    return this.messageFactory.createAssistant(this.nextId());
  }

  private tryNext() {
    if (this.isWorking) {
      return null;
    }
    const job = this.tryGetNextJob();
    if (!job) {
      return false;
    }

    if (job === UserMessageAction.RESET) {
      this.isWorking = true;
      setTimeout(() => this.handleReset());
      return true;
    } else {
      const pending = this.stack.push(job);
      this.isWorking = true;
      setTimeout(() => this.handleMessage(pending));
    }
    return true;
  }

  private async handleReset() {
    try {
      const signal = AbortSignal.timeout(3_000);
      await this.resetAndSave(signal);
    } catch {
      this.logger.warn('Failed to reset and save chat session');
    } finally {
      this.isWorking = false;
    }
  }

  private async handleMessage(pending: PendingChatMessage) {
    await this.maybeSave();
    const message = pending.message;

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
        pending.interrupt();
      } else {
        pending.fail(failReason);
      }
      await this.maybeSave();

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

      this.logger.error(`Error completing message: ${failReason}`);
      return;
    } finally {
      this.isWorking = false;
    }

    this.contextUsage = this.calcContextUsage(result.usage?.total_tokens);
    pending.complete(result.completedMessages);
    await this.maybeSave();

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
