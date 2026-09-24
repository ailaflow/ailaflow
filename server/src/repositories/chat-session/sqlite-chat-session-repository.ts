import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { ChatSessionRepository } from './chat-session-repository';
import { ChatSessionSnapshot } from '@aibindkit/llm';
import { Transaction } from '../../core/transaction';

export class SqliteChatSessionRepository implements ChatSessionRepository {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.chatDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    await this.db.setup(1, 'chat_sessions', (db, version) => {
      if (version < 1) {
        db.exec(`
          CREATE TABLE chat_sessions (
            sessionId TEXT PRIMARY KEY,
            serializedSnapshot TEXT NOT NULL
          ) STRICT
        `);
      }
    });
  }

  public async upsert(_: AbortSignal, sessionId: string, snapshot: ChatSessionSnapshot, transaction?: Transaction): Promise<void> {
    await this.db.write(db => {
      const statement = db.prepare(`
        INSERT INTO chat_sessions (sessionId, serializedSnapshot)
        VALUES (?, ?)
        ON CONFLICT(sessionId) DO UPDATE SET
          serializedSnapshot = excluded.serializedSnapshot
      `);
      statement.run(sessionId, JSON.stringify(snapshot));
    }, transaction);
  }

  public async tryGet(_: AbortSignal, sessionId: string): Promise<ChatSessionSnapshot | null> {
    return this.db.read(db => {
      const statement = db.prepare(`
        SELECT serializedSnapshot
        FROM chat_sessions
        WHERE sessionId = ?
        LIMIT 1
      `);
      const row = statement.get(sessionId) as { serializedSnapshot: string } | undefined;

      return row ? (JSON.parse(row.serializedSnapshot) as ChatSessionSnapshot) : null;
    });
  }
}
