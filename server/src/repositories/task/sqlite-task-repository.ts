import { DatabaseSync } from 'node:sqlite';
import { FormDefinition, JsonSchema } from '@aila/model';
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
        outputVariableSchemas TEXT,
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

  public async tryGet(_: AbortSignal, id: string): Promise<Task | null> {
    const statement = this.db.prepare(`
      SELECT
        id,
        title,
        executionId,
        inputVariableNames,
        outputVariableSchemas,
        form,
        deadline,
        createdAt
      FROM tasks
      WHERE id = ?
      LIMIT 1
    `);
    const row = statement.get(id) as
      | {
          id: string;
          title: string;
          executionId: string;
          inputVariableNames: string;
          outputVariableSchemas: string | null;
          form: string | null;
          deadline: number | null;
          createdAt: number;
        }
      | undefined;

    return row ? deserializeTask(row) : null;
  }

  public async insert(_: AbortSignal, task: Task): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO tasks (
        id,
        title,
        executionId,
        inputVariableNames,
        outputVariableSchemas,
        form,
        deadline,
        createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    statement.run(
      task.id,
      task.title,
      task.executionId,
      JSON.stringify(task.inputVariableNames),
      serializeOutputVariableSchemas(task.outputVariableSchemas),
      serializeForm(task.form),
      task.deadline,
      task.createdAt
    );
  }
}

function deserializeTask(row: {
  id: string;
  title: string;
  executionId: string;
  inputVariableNames: string;
  outputVariableSchemas: string | null;
  form: string | null;
  deadline: number | null;
  createdAt: number;
}): Task {
  return new Task(
    row.id,
    row.title,
    row.executionId,
    JSON.parse(row.inputVariableNames) as string[],
    row.outputVariableSchemas ? (JSON.parse(row.outputVariableSchemas) as Record<string, JsonSchema>) : null,
    row.form ? (JSON.parse(row.form) as FormDefinition) : null,
    row.deadline,
    row.createdAt
  );
}

function serializeOutputVariableSchemas(outputVariableSchemas: Record<string, JsonSchema> | null): string | null {
  return outputVariableSchemas ? JSON.stringify(outputVariableSchemas) : null;
}

function serializeForm(form: FormDefinition | null): string | null {
  return form ? JSON.stringify(form) : null;
}
