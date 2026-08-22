import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { ChatSessionRepository } from './chat-session-repository';
import { ChatMessage } from '@aibindkit/core';

export class SqliteChatSessionRepository implements ChatSessionRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.dataDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        sessionId TEXT PRIMARY KEY,
        messages TEXT NOT NULL
      ) STRICT
    `);
  }

  public async upsert(_: AbortSignal, sessionId: string, messages: ReadonlyArray<ChatMessage>): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO chat_sessions (sessionId, messages)
      VALUES (?, ?)
      ON CONFLICT(sessionId) DO UPDATE SET
        messages = excluded.messages
    `);
    statement.run(sessionId, JSON.stringify(messages));
  }

  public async tryGet(_: AbortSignal, sessionId: string): Promise<ChatMessage[] | null> {
    const statement = this.db.prepare(`
      SELECT messages
      FROM chat_sessions
      WHERE sessionId = ?
      LIMIT 1
    `);
    const row = statement.get(sessionId) as { messages: string } | undefined;

    return row ? (JSON.parse(row.messages) as ChatMessage[]) : null;
  }
}
