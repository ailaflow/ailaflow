import { Message, MessageType } from './messages/message';
import { MessageFactory } from './messages/message-factory';
import { SessionStack } from './session-stack';

export class ChatSession {
  private readonly stopAbortController = new AbortController();
  private isWorking = false;
  private isStopped = false;

  public readonly stack = new SessionStack();
  public readonly queue: Message[] = [];

  public constructor(private readonly messageFactory: MessageFactory) {}

  public pushSystemMessage(text: string) {
    this.queue.push(this.messageFactory.createSystem(text));
  }

  public queueUserMessage(content: string) {
    this.queue.push(this.messageFactory.createUser(content));
    this.tryNext();
  }

  public stop() {
    this.isStopped = true;
    this.stopAbortController.abort();
  }

  private tryNext() {
    if (this.isWorking || this.isStopped) {
      return;
    }

    let nextMessage: Message | undefined;
    let last = this.stack.tryGetLast();
    if (last && last.failed) {
      nextMessage = last.message;
    } else {
      nextMessage = this.queue.shift();
      if (!nextMessage) {
        const isLastAi = last?.message.type === MessageType.AI;
        if (isLastAi) {
          return;
        }
        nextMessage = this.messageFactory.createAi();
      }
      this.stack.push(nextMessage);
    }
    this.isWorking = true;
    void this.completeNext(nextMessage);
  }

  private async completeNext(message: Message) {
    console.log('Completing message of type', MessageType[message.type]);
    try {
      const result = await message.complete(this.stopAbortController.signal, this.stack);
      this.stack.complete(message, result.completedMessage);

      if (result.toolCalls) {
        this.queue.push(this.messageFactory.createTool(result.toolCalls));
      }

      this.isWorking = false;
      this.tryNext();
    } catch (e) {
      const error = (e as Error)?.message ?? String(e);
      this.stack.fail(message, error);
      console.error('Error completing message:', error);
      this.isWorking = false;
    }
  }
}
