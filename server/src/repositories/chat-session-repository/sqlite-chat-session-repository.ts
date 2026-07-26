import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { ChatSessionRepository } from './chat-session-repository';
import { ChatSessionItem } from '@aibindkit/llm';

export class SqliteChatSessionRepository implements ChatSessionRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.chatSessionDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        sessionId TEXT PRIMARY KEY,
        serializedItems TEXT NOT NULL
      ) STRICT
    `);
  }

  public async upsert(_: AbortSignal, sessionId: string, items: ReadonlyArray<ChatSessionItem>): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO chat_sessions (sessionId, serializedItems)
      VALUES (?, ?)
      ON CONFLICT(sessionId) DO UPDATE SET
        serializedItems = excluded.serializedItems
    `);
    statement.run(sessionId, JSON.stringify(items));
  }

  public async tryGet(_: AbortSignal, sessionId: string): Promise<ChatSessionItem[] | null> {
    const statement = this.db.prepare(`
      SELECT serializedItems
      FROM chat_sessions
      WHERE sessionId = ?
      LIMIT 1
    `);
    const row = statement.get(sessionId) as { serializedItems: string } | undefined;

    return row ? (JSON.parse(row.serializedItems) as ChatSessionItem[]) : null;
  }
}
