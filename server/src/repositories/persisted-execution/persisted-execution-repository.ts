import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { Repository } from '../repository';
import { PersistedExecution } from './persisted-execution';
import { SerializedWorkflowMachineSnapshot } from 'sequential-workflow-machine';
import { SerializedProcessExecutionGlobalState } from '../../process-executor/process-execution-global-state';
import { ProcessExecutionContext } from '../../process-executor/process-execution-context';

export interface PersistedExecutionRepository extends Repository {
  upsert(abortSignal: AbortSignal, execution: PersistedExecution): Promise<void>;
  tryGet(abortSignal: AbortSignal, executionId: string): Promise<PersistedExecution | null>;
  delete(abortSignal: AbortSignal, executionId: string): Promise<void>;
}

export class SqlitePersistedExecutionRepository implements PersistedExecutionRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.dataDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS persisted_executions (
        executionId TEXT PRIMARY KEY,
        context TEXT NOT NULL,
        processName TEXT NOT NULL,
        processHash TEXT NOT NULL,
        state TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      ) STRICT
    `);
  }

  public async upsert(_: AbortSignal, execution: PersistedExecution): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO persisted_executions (executionId, context, processName, processHash, state, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(executionId) DO UPDATE SET
        context = excluded.context,
        processName = excluded.processName,
        processHash = excluded.processHash,
        state = excluded.state,
        updatedAt = excluded.updatedAt
    `);
    statement.run(
      execution.executionId,
      JSON.stringify(execution.context),
      execution.processName,
      execution.processHash,
      JSON.stringify(execution.state),
      execution.createdAt,
      execution.updatedAt
    );
  }

  public async tryGet(_: AbortSignal, executionId: string): Promise<PersistedExecution | null> {
    const statement = this.db.prepare(`
      SELECT executionId, context, processName, processHash, state, createdAt, updatedAt
      FROM persisted_executions
      WHERE executionId = ?
      LIMIT 1
    `);
    const row = statement.get(executionId) as
      | {
          executionId: string;
          context: string;
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
          JSON.parse(row.context) as ProcessExecutionContext,
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
}
