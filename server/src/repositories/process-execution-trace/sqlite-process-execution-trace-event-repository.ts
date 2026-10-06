import { ProcessExecutionTraceEventType } from '@ailaflow/shared';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { ProcessExecutionTraceEvent } from './process-execution-trace-event';
import { ProcessExecutionTraceEventRepository } from './process-execution-trace-event-repository';

interface ProcessExecutionTraceEventRow {
  executionId: string;
  type: ProcessExecutionTraceEventType;
  data: string | null;
  createdAt: number;
}

export class SqliteProcessExecutionTraceEventRepository implements ProcessExecutionTraceEventRepository {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.dataDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    await this.db.setup(1, 'process_execution_trace_events', (db, version) => {
      if (version < 1) {
        db.exec(`
          CREATE TABLE process_execution_trace_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            executionId TEXT NOT NULL REFERENCES process_execution_traces(executionId) ON DELETE CASCADE,
            type INTEGER NOT NULL,
            data TEXT,
            createdAt INTEGER NOT NULL
          ) STRICT;

          CREATE INDEX process_execution_trace_events_execution
          ON process_execution_trace_events (executionId, id);
        `);
      }
    });
  }

  public async insert(_: AbortSignal, event: ProcessExecutionTraceEvent): Promise<void> {
    await this.db.write(db => {
      db.prepare(
        `
          INSERT INTO process_execution_trace_events (executionId, type, data, createdAt)
          VALUES (?, ?, ?, ?)
        `
      ).run(event.executionId, event.type, event.data === null ? null : JSON.stringify(event.data), event.createdAt);
    });
  }

  public async getAll(_: AbortSignal, executionId: string): Promise<ProcessExecutionTraceEvent[]> {
    return this.db.read(db => {
      const rows = db
        .prepare(
          `
            SELECT executionId, type, data, createdAt
            FROM process_execution_trace_events
            WHERE executionId = ?
            ORDER BY id
          `
        )
        .all(executionId) as unknown as ProcessExecutionTraceEventRow[];

      return rows.map(
        row =>
          new ProcessExecutionTraceEvent(
            row.executionId,
            row.type,
            row.data === null ? null : (JSON.parse(row.data) as object),
            row.createdAt
          )
      );
    });
  }
}
