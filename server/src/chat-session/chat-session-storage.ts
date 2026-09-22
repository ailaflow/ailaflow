import { ChatSessionSnapshot, ChatSessionStorage as Interface } from '@aibindkit/llm';
import { ChatSessionRepository } from '../repositories/chat-session/chat-session-repository';
import { Logger } from '../core/logger';

export class ChatSessionStorage implements Interface {
  private readonly timeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly logger = new Logger(ChatSessionStorage.name);

  public constructor(private readonly repository: ChatSessionRepository) {}

  public save(signal: AbortSignal, sessionId: string, snapshot: ChatSessionSnapshot): Promise<void> {
    this.timeouts.set(
      sessionId,
      setTimeout(async () => {
        this.timeouts.delete(sessionId);
        try {
          await this.repository.upsert(signal, sessionId, snapshot);
        } catch (e) {
          this.logger.error(`Failed to save chat session: ${(e as Error).message ?? e}`);
        }
      }, 1_000)
    );
    return Promise.resolve();
  }

  public tryGet(signal: AbortSignal, sessionId: string): Promise<ChatSessionSnapshot | null> {
    return this.repository.tryGet(signal, sessionId);
  }
}
