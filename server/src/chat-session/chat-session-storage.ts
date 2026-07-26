import { ChatSessionStorage as Interface, ChatSessionItem } from '@aibindkit/llm';
import { ChatSessionRepository } from '../repositories/chat-session-repository/chat-session-repository';
import { Logger } from '../core/logger';

export class ChatSessionStorage implements Interface {
  private readonly timeouts = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly logger = new Logger(ChatSessionStorage.name);

  public constructor(private readonly repository: ChatSessionRepository) {}

  public save(abortSignal: AbortSignal, sessionId: string, items: ReadonlyArray<ChatSessionItem>): Promise<void> {
    this.timeouts.set(
      sessionId,
      setTimeout(async () => {
        this.timeouts.delete(sessionId);
        try {
          await this.repository.upsert(abortSignal, sessionId, items);
        } catch (e) {
          this.logger.error(`Failed to save chat session: ${(e as Error).message ?? e}`);
        }
      }, 1_000)
    );
    return Promise.resolve();
  }

  public tryGet(abortSignal: AbortSignal, sessionId: string): Promise<ChatSessionItem[] | null> {
    return this.repository.tryGet(abortSignal, sessionId);
  }
}
