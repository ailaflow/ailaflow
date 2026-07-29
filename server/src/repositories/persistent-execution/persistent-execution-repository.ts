import { DatabaseSync } from 'node:sqlite';
import { ChatMessage } from '@aibindkit/core';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { Repository } from '../repository';
import { PersistentExecution } from './persistent-execution';

export interface PersistentExecutionRepository extends Repository {
  upsert(abortSignal: AbortSignal, execution: PersistentExecution): Promise<void>;
  tryGet(abortSignal: AbortSignal, executionId: string): Promise<ChatMessage[] | null>;
}

export class SqlitePersistentExecutionRepository implements PersistentExecutionRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.chatSessionDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS persistent_executions (
        executionId TEXT PRIMARY KEY,
        state TEXT NOT NULL,
        createdAt INTEGER NOT NULL
      ) STRICT
    `);
  }

  public async upsert(_: AbortSignal, execution: PersistentExecution): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO persistent_executions (executionId, state, createdAt)
      VALUES (?, ?, ?)
      ON CONFLICT(executionId) DO UPDATE SET
        state = excluded.state,
        createdAt = excluded.createdAt
    `);
    statement.run(execution.executionId, JSON.stringify(execution.state), execution.createdAt);
  }

  public async tryGet(_: AbortSignal, executionId: string): Promise<ChatMessage[] | null> {
    const statement = this.db.prepare(`
      SELECT state
      FROM persistent_executions
      WHERE executionId = ?
      LIMIT 1
    `);
    const row = statement.get(executionId) as { state: string } | undefined;

    return row ? (JSON.parse(row.state) as ChatMessage[]) : null;
  }
}
