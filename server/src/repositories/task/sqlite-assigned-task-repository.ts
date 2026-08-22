import { DatabaseSync } from 'node:sqlite';
import { ProcessExecutionVariableValues } from '@aila/model';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { AssignedTaskRepository } from './assigned-task-repository';
import { AssignedTask } from './assigned-task';

export class SqliteAssignedTaskRepository implements AssignedTaskRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    this.db.exec(`
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
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS assigned_tasks_user_name_idx
      ON assigned_tasks(userName)
    `);
  }

  public async tryGet(_: AbortSignal, taskId: string, userName: string): Promise<AssignedTask | null> {
    const statement = this.db.prepare(`
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
  }

  public async getAllCompleted(_: AbortSignal, taskId: string): Promise<AssignedTask[]> {
    const statement = this.db.prepare(`
      SELECT taskId, userName, channelName, completedAt, outputValues
      FROM assigned_tasks
      WHERE taskId = ?
        AND completedAt IS NOT NULL
      ORDER BY userName
    `);
    const rows = statement.all(taskId) as unknown as AssignedTaskRow[];

    return rows.map(mapAssignedTask);
  }

  public async upsert(_: AbortSignal, assignedTask: AssignedTask): Promise<void> {
    const statement = this.createUpsertStatement();
    this.runUpsert(statement, assignedTask);
  }

  public async upsertMultiple(_: AbortSignal, assignedTasks: AssignedTask[]): Promise<void> {
    if (assignedTasks.length === 0) {
      return;
    }

    const statement = this.createUpsertStatement();
    try {
      this.db.exec(`BEGIN`);
      for (const assignedTask of assignedTasks) {
        this.runUpsert(statement, assignedTask);
      }
      this.db.exec(`COMMIT`);
    } catch (e) {
      this.db.exec(`ROLLBACK`);
      throw e;
    }
  }

  private createUpsertStatement(): ReturnType<DatabaseSync['prepare']> {
    return this.db.prepare(`
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
