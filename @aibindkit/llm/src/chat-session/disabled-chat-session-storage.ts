import { ChatMessage } from '@aibindkit/core';
import { ChatSessionStorage } from './chat-session-storage';

export class DisabledChatSessionStorage implements ChatSessionStorage {
  public async save() {
    // Nothing.
  }

  public async tryGet(): Promise<ChatMessage[] | null> {
    return null;
  }
}
