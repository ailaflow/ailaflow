import { ChatSessionStorage } from './chat-session-storage';
import { ChatSessionSnapshot } from './chat-session';

export class DisabledChatSessionStorage implements ChatSessionStorage {
  public async save() {
    // Nothing.
  }

  public async tryGet(): Promise<ChatSessionSnapshot | null> {
    return null;
  }
}
