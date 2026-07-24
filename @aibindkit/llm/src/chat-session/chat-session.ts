import type { MessageChatUpdate } from '@aibindkit/core';
import { MessageType, SimpleEvent } from '@aibindkit/core';
import { Message, MessageCompletionResult } from './messages/message';
import { MessageFactory } from './messages/message-factory';
import { SessionStack } from './session-stack';
import { ChatSessionQueue } from './chat-session-queue';
import { ToolContext } from './tools';

export interface ChatSessionUpdate {
  isWorking: boolean;
  update: MessageChatUpdate;
}

export class ChatSession {
  public readonly onMessageStarted = new SimpleEvent<ChatSessionUpdate>();
  public readonly onMessageCompleted = new SimpleEvent<ChatSessionUpdate>();
  public readonly onMessageFailed = new SimpleEvent<ChatSessionUpdate>();
  public readonly onReset = new SimpleEvent<void>();

  private interruptAbortController = new AbortController();
  private isWorking = false;
  private isInterrupted = false;
  private lastId = 0;

  private readonly stack = new SessionStack();
  private readonly queue = new ChatSessionQueue();
  private systemMessage?: string;

  private readonly toolContext: ToolContext = {
    sessionId: this.id,
    sessionToken: this.token
  };

  public constructor(
    public readonly id: string,
    public readonly token: string,
    public readonly hash: string,
    private readonly messageFactory: MessageFactory
  ) {}

  public setSystemMessage(systemMessage: string) {
    this.systemMessage = systemMessage;
  }

  public queueUserMessage(content: string): number {
    if (this.isInterrupted) {
      this.isInterrupted = false;
      this.interruptAbortController = new AbortController();
    }

    if (this.systemMessage && this.stack.isEmpty() && this.queue.isEmpty()) {
      const sid = this.nextId();
      this.queue.push(this.messageFactory.createSystem(sid, this.systemMessage));
    }

    const uid = this.nextId();
    this.queue.push(this.messageFactory.createUser(uid, content));
    this.tryNext();
    return uid;
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
  }

  public getAll(): MessageChatUpdate[] {
    const all = this.stack.all();
    const result: MessageChatUpdate[] = [];
    for (const item of all) {
      result.push({
        id: item.message.id,
        type: item.message.type,
        isInterrupted: item.isInterrupted,
        failReason: item.failReason,
        completedMessages: item.completedMessages
      });
    }
    return result;
  }

  private tryNext() {
    if (this.isWorking) {
      return null;
    }

    const last = this.stack.tryGetLast();
    let message: Message;
    if (last && last.message.type === MessageType.TOOL) {
      message = this.messageFactory.createAi(this.nextId());
    } else {
      const nextMessage = this.queue.shift();
      if (nextMessage) {
        message = nextMessage;
      } else {
        const isLastAi = last?.message.type === MessageType.AI;
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
      const failReason = (e as Error)?.message ?? String(e);
      const isInterrupted = interruptSignal.aborted;

      if (isInterrupted) {
        this.stack.interrupt(message);
      } else {
        this.stack.fail(message, failReason);
      }
      // TODO: we should probably restore user messages in UI here, that a user won't lose their input if the session fails.
      this.queue.clear();

      this.onMessageFailed.emit({
        isWorking: false,
        update: {
          id: message.id,
          type: message.type,
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

    if (result.toolCalls) {
      const tid = this.nextId();
      const toolMessage = this.messageFactory.createTool(tid, this.toolContext, result.toolCalls);
      this.queue.pushAfterType(toolMessage, MessageType.TOOL);
    }

    const hasNext = this.tryNext();
    this.onMessageCompleted.emit({
      isWorking: hasNext === true,
      update: {
        id: message.id,
        type: message.type,
        completedMessages: result.completedMessages
      }
    });
  }

  private nextId(): number {
    return ++this.lastId;
  }
}
