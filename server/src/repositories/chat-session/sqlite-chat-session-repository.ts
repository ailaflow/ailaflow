import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { ChatSessionRepository } from './chat-session-repository';
import { ChatSessionSnapshot } from '@aibindkit/llm';

export class SqliteChatSessionRepository implements ChatSessionRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.dataDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        sessionId TEXT PRIMARY KEY,
        serializedSnapshot TEXT NOT NULL
      ) STRICT
    `);
  }

  public async upsert(_: AbortSignal, sessionId: string, snapshot: ChatSessionSnapshot): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO chat_sessions (sessionId, serializedSnapshot)
      VALUES (?, ?)
      ON CONFLICT(sessionId) DO UPDATE SET
        serializedSnapshot = excluded.serializedSnapshot
    `);
    statement.run(sessionId, JSON.stringify(snapshot));
  }

  public async tryGet(_: AbortSignal, sessionId: string): Promise<ChatSessionSnapshot | null> {
    const statement = this.db.prepare(`
      SELECT serializedSnapshot
      FROM chat_sessions
      WHERE sessionId = ?
      LIMIT 1
    `);
    const row = statement.get(sessionId) as { serializedSnapshot: string } | undefined;

    return row ? (JSON.parse(row.serializedSnapshot) as ChatSessionSnapshot) : null;
  }
}
