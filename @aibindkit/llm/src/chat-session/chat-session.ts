import type { CompletedMessage } from '@aibindkit/core';
import { MessageType, SimpleEvent } from '@aibindkit/core';
import { Message, MessageCompleteResult } from './messages/message';
import { MessageFactory } from './messages/message-factory';
import { SessionStack } from './session-stack';
import { ChatSessionQueue } from './chat-session-queue';

export interface MessageUpdate {
  id: number;
  type: MessageType;
  isInterrupted?: true;
  failReason?: string;
  completedMessage?: CompletedMessage | CompletedMessage[];
}

export interface ChatSessionUpdate {
  isWorking: boolean;
  update: MessageUpdate;
}

export class ChatSession {
  public readonly onMessageCompleted = new SimpleEvent<ChatSessionUpdate>();
  public readonly onMessageFailed = new SimpleEvent<ChatSessionUpdate>();

  private interruptAbortController = new AbortController();
  private isWorking = false;
  private isInterrupted = false;
  private lastId = 0;

  private readonly stack = new SessionStack();
  private readonly queue = new ChatSessionQueue();

  public constructor(
    public readonly id: string,
    public readonly hash: string,
    private readonly messageFactory: MessageFactory
  ) {}

  public pushSystemMessage(text: string) {
    this.queue.push(this.messageFactory.createSystem(this.nextId(), text));
  }

  public queueUserMessage(content: string): number {
    if (this.isInterrupted) {
      this.isInterrupted = false;
      this.interruptAbortController = new AbortController();
    }

    const id = this.nextId();
    this.queue.push(this.messageFactory.createUser(id, content));
    this.tryNext();
    return id;
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

  public getAll(): MessageUpdate[] {
    const all = this.stack.all();
    const result = new Array<MessageUpdate>(all.length);
    all.forEach(
      (item, index) =>
        (result[index] = {
          id: item.message.id,
          type: item.message.type,
          isInterrupted: item.isInterrupted,
          failReason: item.failReason,
          completedMessage: item.completedMessage
        })
    );
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
    const interruptSignal = this.interruptAbortController.signal;
    let result: MessageCompleteResult;
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

    this.stack.complete(message, result.completedMessage);

    if (result.toolCalls) {
      const toolMessage = this.messageFactory.createTool(this.nextId(), result.toolCalls);
      this.queue.pushAfterType(toolMessage, MessageType.TOOL);
    }

    const hasNext = this.tryNext();
    this.onMessageCompleted.emit({
      isWorking: hasNext === true,
      update: {
        id: message.id,
        type: message.type,
        completedMessage: result.completedMessage
      }
    });
  }

  private nextId(): number {
    return ++this.lastId;
  }
}
