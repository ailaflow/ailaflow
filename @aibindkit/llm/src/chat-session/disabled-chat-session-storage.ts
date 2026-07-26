import { ChatSessionItem } from './chat-session-item';
import { ChatSessionStorage } from './chat-session-storage';

export class DisabledChatSessionStorage implements ChatSessionStorage {
  public async save() {
    // Nothing.
  }

  public async tryGet(): Promise<ChatSessionItem[] | null> {
    return null;
  }
}
