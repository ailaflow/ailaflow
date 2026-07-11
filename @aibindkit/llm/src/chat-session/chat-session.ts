import type { CompletedMessage } from '@aibindkit/core';
import { MessageType } from '@aibindkit/core';
import { Ev } from '../core/ev';
import { Message } from './messages/message';
import { MessageFactory } from './messages/message-factory';
import { SessionStack } from './session-stack';

export interface MessageUpdate {
  id: number;
  type: MessageType;
  failReason?: string;
  completedMessage?: CompletedMessage | CompletedMessage[];
}

export class ChatSession {
  public readonly onMessageCompleted = new Ev<MessageUpdate>();
  public readonly onMessageFailed = new Ev<MessageUpdate>();

  public totalTokens?: number;

  private readonly stopAbortController = new AbortController();
  private isWorking = false;
  private isStopped = false;
  private lastId = 0;

  private readonly stack = new SessionStack();
  private readonly queue: Message[] = [];

  public constructor(
    public readonly id: string,
    public readonly hash: string,
    private readonly messageFactory: MessageFactory
  ) {}

  public pushSystemMessage(text: string) {
    this.queue.push(this.messageFactory.createSystem(this.nextId(), text));
  }

  public queueUserMessage(content: string): number {
    const id = this.nextId();
    this.queue.push(this.messageFactory.createUser(id, content));
    this.tryNext();
    return id;
  }

  public stop() {
    this.isStopped = true;
    this.stopAbortController.abort();
  }

  public getAll(): MessageUpdate[] {
    const all = this.stack.all();
    const result = new Array<MessageUpdate>(all.length);
    all.forEach(
      (item, index) =>
        (result[index] = {
          id: item.message.id,
          type: item.message.type,
          failReason: item.failReason,
          completedMessage: item.completedMessage
        })
    );
    return result;
  }

  private tryNext() {
    if (this.isWorking || this.isStopped) {
      return;
    }

    let nextMessage = this.queue.shift();
    if (!nextMessage) {
      const last = this.stack.tryGetLast();
      const isLastAi = last?.message.type === MessageType.AI;
      if (isLastAi) {
        return;
      }
      nextMessage = this.messageFactory.createAi(this.nextId());
    }
    this.stack.push(nextMessage);
    this.isWorking = true;
    void this.next(nextMessage);
  }

  private async next(message: Message) {
    try {
      const result = await message.complete(this.stopAbortController.signal, this.stack);
      if (result.totalTokens) {
        this.totalTokens = result.totalTokens;
      }

      this.stack.complete(message, result.completedMessage);
      this.onMessageCompleted.emit({
        id: message.id,
        type: message.type,
        completedMessage: result.completedMessage
      });

      if (result.toolCalls) {
        this.queue.push(this.messageFactory.createTool(this.nextId(), result.toolCalls));
      }

      this.isWorking = false;
      this.tryNext();
    } catch (e) {
      const error = (e as Error)?.message ?? String(e);
      const failReason = `LLM server returned an error: ${error}`;

      this.stack.fail(message, failReason);
      this.onMessageFailed.emit({
        id: message.id,
        type: message.type,
        failReason
      });

      console.error('Error completing message:', failReason);
      this.isWorking = false;
    }
  }

  private nextId(): number {
    return ++this.lastId;
  }
}
