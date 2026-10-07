import { ProcessExecutionTraceRetention, ProcessExecutionTraceStatus, ProcessExecutionTrigger } from '@ailaflow/shared';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { ProcessExecutionTrace } from './process-execution-trace';
import { ProcessExecutionTraceRepository } from './process-execution-trace-repository';

interface ProcessExecutionTraceRow {
  executionId: string;
  trigger: ProcessExecutionTrigger;
  status: ProcessExecutionTraceStatus;
  processName: string;
  retention: ProcessExecutionTraceRetention;
  startedBy: string;
  updatedAt: number;
  error: string | null;
  completedAt: number | null;
  expiresAt: number | null;
}

export class SqliteProcessExecutionTraceRepository implements ProcessExecutionTraceRepository {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.dataDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    await this.db.setup(2, 'process_execution_traces', (db, version) => {
      if (version < 1) {
        db.exec(`
          CREATE TABLE process_execution_traces (
            executionId TEXT PRIMARY KEY,
            trigger INTEGER NOT NULL,
            status INTEGER NOT NULL,
            processName TEXT NOT NULL,
            retention INTEGER NOT NULL,
            startedBy TEXT NOT NULL,
            updatedAt INTEGER NOT NULL,
            completedAt INTEGER,
            expiresAt INTEGER
          ) STRICT;

          CREATE INDEX process_execution_traces_expiration
          ON process_execution_traces (expiresAt)
          WHERE expiresAt IS NOT NULL;

          CREATE INDEX process_execution_traces_page
          ON process_execution_traces (updatedAt DESC, executionId DESC);

          CREATE INDEX process_execution_traces_process_page
          ON process_execution_traces (processName, updatedAt DESC, executionId DESC);
        `);
      }
      if (version < 2) {
        db.exec(`ALTER TABLE process_execution_traces ADD COLUMN error TEXT`);
      }
    });
  }

  public async tryGet(_: AbortSignal, executionId: string): Promise<ProcessExecutionTrace | null> {
    return this.db.read(db => {
      const row = db
        .prepare(
          `
            SELECT executionId, trigger, status, processName, retention, startedBy, updatedAt, error, completedAt, expiresAt
            FROM process_execution_traces
            WHERE executionId = ?
            LIMIT 1
          `
        )
        .get(executionId) as ProcessExecutionTraceRow | undefined;

      return row ? deserialize(row) : null;
    });
  }

  public async upsert(_: AbortSignal, trace: ProcessExecutionTrace): Promise<void> {
    await this.db.write(db => {
      db.prepare(
        `
          INSERT INTO process_execution_traces (
            executionId, trigger, status, processName, retention, startedBy, updatedAt, error, completedAt, expiresAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(executionId) DO UPDATE SET
            status = excluded.status,
            updatedAt = excluded.updatedAt,
            error = excluded.error,
            completedAt = excluded.completedAt,
            expiresAt = excluded.expiresAt
        `
      ).run(
        trace.executionId,
        trace.trigger,
        trace.status,
        trace.processName,
        trace.retention,
        trace.startedBy,
        trace.updatedAt,
        trace.error,
        trace.completedAt,
        trace.expiresAt
      );
    });
  }

  public async deleteOldWithAllEvents(_: AbortSignal, now: number): Promise<number> {
    return this.db.write(db =>
      Number(
        db
          .prepare(
            `
              DELETE FROM process_execution_traces
              WHERE expiresAt IS NOT NULL AND expiresAt < ?
            `
          )
          .run(now).changes
      )
    );
  }

  public async getPage(_: AbortSignal, offset: number, limit: number, processName?: string): Promise<ProcessExecutionTrace[]> {
    return this.db.read(db => {
      const columns = `executionId, trigger, status, processName, retention, startedBy, updatedAt, error, completedAt, expiresAt`;
      const rows =
        processName === undefined
          ? db
              .prepare(
                `
                  SELECT ${columns}
                  FROM process_execution_traces
                  ORDER BY updatedAt DESC, executionId DESC
                  LIMIT ? OFFSET ?
                `
              )
              .all(limit, offset)
          : db
              .prepare(
                `
                  SELECT ${columns}
                  FROM process_execution_traces
                  WHERE processName = ?
                  ORDER BY updatedAt DESC, executionId DESC
                  LIMIT ? OFFSET ?
                `
              )
              .all(processName, limit, offset);

      return (rows as unknown as ProcessExecutionTraceRow[]).map(deserialize);
    });
  }

  public async count(_: AbortSignal, processName?: string): Promise<number> {
    return this.db.read(db => {
      const row =
        processName === undefined
          ? db.prepare(`SELECT COUNT(*) AS count FROM process_execution_traces`).get()
          : db.prepare(`SELECT COUNT(*) AS count FROM process_execution_traces WHERE processName = ?`).get(processName);
      return (row as { count: number }).count;
    });
  }
}

function deserialize(row: ProcessExecutionTraceRow): ProcessExecutionTrace {
  return new ProcessExecutionTrace(
    row.executionId,
    row.trigger,
    row.status,
    row.processName,
    row.retention,
    row.startedBy,
    row.updatedAt,
    row.error,
    row.completedAt,
    row.expiresAt
  );
}
