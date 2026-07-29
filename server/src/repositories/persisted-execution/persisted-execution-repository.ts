import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { Repository } from '../repository';
import { PersistedExecution } from './persisted-execution';
import { SerializedWorkflowMachineSnapshot } from 'sequential-workflow-machine';
import { SerializedProcessExecutionGlobalState } from '../../process-executor/process-execution-global-state';

export interface PersistedExecutionRepository extends Repository {
  upsert(abortSignal: AbortSignal, execution: PersistedExecution): Promise<void>;
  tryGet(abortSignal: AbortSignal, executionId: string): Promise<PersistedExecution | null>;
  delete(abortSignal: AbortSignal, executionId: string): Promise<void>;
}

export class SqlitePersistedExecutionRepository implements PersistedExecutionRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.chatSessionDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    this.migrateOldTable();
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS persisted_executions (
        executionId TEXT PRIMARY KEY,
        processName TEXT NOT NULL,
        processHash TEXT NOT NULL,
        state TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      ) STRICT
    `);
    this.addColumnIfMissing('processName', `ALTER TABLE persisted_executions ADD COLUMN processName TEXT NOT NULL DEFAULT ''`);
    this.addColumnIfMissing('processHash', `ALTER TABLE persisted_executions ADD COLUMN processHash TEXT NOT NULL DEFAULT ''`);
    this.addColumnIfMissing('updatedAt', `ALTER TABLE persisted_executions ADD COLUMN updatedAt INTEGER NOT NULL DEFAULT 0`);
  }

  public async upsert(_: AbortSignal, execution: PersistedExecution): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO persisted_executions (executionId, processName, processHash, state, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(executionId) DO UPDATE SET
        processName = excluded.processName,
        processHash = excluded.processHash,
        state = excluded.state,
        updatedAt = excluded.updatedAt
    `);
    statement.run(
      execution.executionId,
      execution.processName,
      execution.processHash,
      JSON.stringify(execution.state),
      execution.createdAt,
      execution.updatedAt
    );
  }

  public async tryGet(_: AbortSignal, executionId: string): Promise<PersistedExecution | null> {
    const statement = this.db.prepare(`
      SELECT executionId, processName, processHash, state, createdAt, updatedAt
      FROM persisted_executions
      WHERE executionId = ?
      LIMIT 1
    `);
    const row = statement.get(executionId) as
      | {
          executionId: string;
          processName: string;
          processHash: string;
          state: string;
          createdAt: number;
          updatedAt: number;
        }
      | undefined;

    return row
      ? new PersistedExecution(
          row.executionId,
          row.processName,
          row.processHash,
          JSON.parse(row.state) as SerializedWorkflowMachineSnapshot<SerializedProcessExecutionGlobalState>,
          row.createdAt,
          row.updatedAt
        )
      : null;
  }

  public async delete(_: AbortSignal, executionId: string): Promise<void> {
    const statement = this.db.prepare(`
      DELETE FROM persisted_executions
      WHERE executionId = ?
    `);
    statement.run(executionId);
  }

  private addColumnIfMissing(columnName: string, statement: string): void {
    const rows = this.db.prepare(`PRAGMA table_info(persisted_executions)`).all() as { name: string }[];
    if (!rows.some(row => row.name === columnName)) {
      this.db.exec(statement);
    }
  }

  private migrateOldTable(): void {
    const oldTable = this.db
      .prepare(
        `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name = 'persistent_executions'
        LIMIT 1
      `
      )
      .get() as { name: string } | undefined;
    const newTable = this.db
      .prepare(
        `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name = 'persisted_executions'
        LIMIT 1
      `
      )
      .get() as { name: string } | undefined;

    if (oldTable && !newTable) {
      this.db.exec(`ALTER TABLE persistent_executions RENAME TO persisted_executions`);
    }
  }
}
