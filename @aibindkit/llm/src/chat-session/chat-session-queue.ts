import { ChatMessageType } from '@aibindkit/core';
import { Message } from './messages/message';

export class ChatSessionQueue {
  private readonly queue: Message[] = [];

  public push(message: Message) {
    this.queue.push(message);
  }

  public pushAfterType(message: Message, type: ChatMessageType) {
    let index = 0;
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].type === type) {
        index = i + 1;
      }
    }
    this.queue.splice(index, 0, message);
  }

  public shift(): Message | undefined {
    return this.queue.shift();
  }

  public isEmpty(): boolean {
    return this.queue.length === 0;
  }

  public clear() {
    this.queue.length = 0;
  }
}
