import { DatabaseSync } from 'node:sqlite';
import { ProcessExecutionVariableValues } from '@ailaflow/shared';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { AssignedTaskRepository } from './assigned-task-repository';
import { AssignedTask } from './assigned-task';
import { Transaction } from '../../core/transaction';

export class SqliteAssignedTaskRepository implements AssignedTaskRepository {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    await this.db.write(db => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS assigned_tasks (
          taskId TEXT NOT NULL,
          userName TEXT NOT NULL,
          channelName TEXT NOT NULL,
          completedAt INTEGER,
          outputValues TEXT,

          PRIMARY KEY (taskId, userName),

          FOREIGN KEY (taskId)
            REFERENCES tasks(id)
            ON DELETE CASCADE,

          FOREIGN KEY (userName)
            REFERENCES users(name)
            ON DELETE CASCADE,

          CHECK (completedAt IS NULL OR completedAt >= 0)
        ) STRICT
      `);
      db.exec(`
        CREATE INDEX IF NOT EXISTS assigned_tasks_user_name_idx
        ON assigned_tasks(userName)
      `);
    });
  }

  public async tryGet(_: AbortSignal, taskId: string, userName: string): Promise<AssignedTask | null> {
    return this.db.read(db => {
      const statement = db.prepare(`
        SELECT taskId, userName, channelName, completedAt, outputValues
        FROM assigned_tasks
        WHERE taskId = ?
          AND userName = ?
        LIMIT 1
      `);
      const row = statement.get(taskId, userName) as
        | {
            taskId: string;
            userName: string;
            channelName: string;
            completedAt: number | null;
            outputValues: string | null;
          }
        | undefined;

      return row ? mapAssignedTask(row) : null;
    });
  }

  public async getAllCompleted(_: AbortSignal, taskId: string): Promise<AssignedTask[]> {
    return this.db.read(db => {
      const statement = db.prepare(`
        SELECT taskId, userName, channelName, completedAt, outputValues
        FROM assigned_tasks
        WHERE taskId = ?
          AND completedAt IS NOT NULL
        ORDER BY userName
      `);
      const rows = statement.all(taskId) as unknown as AssignedTaskRow[];

      return rows.map(mapAssignedTask);
    });
  }

  public async upsert(_: AbortSignal, assignedTask: AssignedTask, transaction?: Transaction): Promise<void> {
    await this.db.write(db => {
      const statement = this.createUpsertStatement(db);
      this.runUpsert(statement, assignedTask);
    }, transaction);
  }

  public async upsertMultiple(_: AbortSignal, assignedTasks: AssignedTask[], transaction?: Transaction): Promise<void> {
    if (assignedTasks.length === 0) {
      return;
    }

    await this.db.write(db => {
      const statement = this.createUpsertStatement(db);
      for (const assignedTask of assignedTasks) {
        this.runUpsert(statement, assignedTask);
      }
    }, transaction);
  }

  private createUpsertStatement(db: DatabaseSync): ReturnType<DatabaseSync['prepare']> {
    return db.prepare(`
      INSERT INTO assigned_tasks (taskId, userName, channelName, completedAt, outputValues)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(taskId, userName) DO UPDATE SET
        channelName = excluded.channelName,
        completedAt = excluded.completedAt,
        outputValues = excluded.outputValues
    `);
  }

  private runUpsert(statement: ReturnType<DatabaseSync['prepare']>, assignedTask: AssignedTask): void {
    statement.run(
      assignedTask.taskId,
      assignedTask.userName,
      assignedTask.channelName,
      assignedTask.completedAt,
      assignedTask.outputValues === null ? null : JSON.stringify(assignedTask.outputValues)
    );
  }
}

interface AssignedTaskRow {
  taskId: string;
  userName: string;
  channelName: string;
  completedAt: number | null;
  outputValues: string | null;
}

function mapAssignedTask(row: AssignedTaskRow): AssignedTask {
  return new AssignedTask(
    row.taskId,
    row.userName,
    row.channelName,
    row.completedAt,
    row.outputValues === null ? null : (JSON.parse(row.outputValues) as ProcessExecutionVariableValues)
  );
}
