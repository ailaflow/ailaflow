import { DatabaseSync } from 'node:sqlite';
import { FormDefinition } from '@aila/model';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { Task } from './task';
import { TaskRepository } from './task-repository';

export class SqliteTaskRepository implements TaskRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        executionId TEXT NOT NULL,
        inputVariableNames TEXT NOT NULL,
        outputVariableNames TEXT NOT NULL,
        form TEXT,
        deadline INTEGER,
        createdAt INTEGER NOT NULL
      ) STRICT
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS tasks_execution_id_idx
      ON tasks(executionId)
    `);
  }

  public async upsert(_: AbortSignal, task: Task): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO tasks (
        id,
        title,
        executionId,
        inputVariableNames,
        outputVariableNames,
        form,
        deadline,
        createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        executionId = excluded.executionId,
        inputVariableNames = excluded.inputVariableNames,
        outputVariableNames = excluded.outputVariableNames,
        form = excluded.form,
        deadline = excluded.deadline,
        createdAt = excluded.createdAt
    `);
    statement.run(
      task.id,
      task.title,
      task.executionId,
      JSON.stringify(task.inputVariableNames),
      JSON.stringify(task.outputVariableNames),
      serializeForm(task.form),
      task.deadline,
      task.createdAt
    );
  }
}

function serializeForm(form: FormDefinition | null): string | null {
  return form ? JSON.stringify(form) : null;
}
