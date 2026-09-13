import { DatabaseSync } from 'node:sqlite';
import { FormDefinition, JsonSchema, taskFinalizationPolicySchema } from '@ailaflow/shared';
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
        isTest INTEGER NOT NULL,
        createdBy TEXT NOT NULL,
        executionId TEXT NOT NULL,
        inputVariableNames TEXT NOT NULL,
        outputVariableSchemas TEXT,
        form TEXT,
        deadline INTEGER,
        finalizationPolicy TEXT NOT NULL,
        metadataVariableName TEXT,
        createdAt INTEGER NOT NULL,
        finalizedAt INTEGER
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
        isTest,
        createdBy,
        executionId,
        inputVariableNames,
        outputVariableSchemas,
        form,
        deadline,
        finalizationPolicy,
        metadataVariableName,
        createdAt,
        finalizedAt
      FROM tasks
      WHERE id = ?
      LIMIT 1
    `);
    const row = statement.get(id) as
      | {
          id: string;
          title: string;
          isTest: number;
          createdBy: string;
          executionId: string;
          inputVariableNames: string;
          outputVariableSchemas: string | null;
          form: string | null;
          deadline: number | null;
          finalizationPolicy: string;
          metadataVariableName: string | null;
          createdAt: number;
          finalizedAt: number | null;
        }
      | undefined;

    return row ? deserializeTask(row) : null;
  }

  public async insert(_: AbortSignal, task: Task): Promise<void> {
    const statement = this.db.prepare(`
      INSERT INTO tasks (
        id,
        title,
        isTest,
        createdBy,
        executionId,
        inputVariableNames,
        outputVariableSchemas,
        form,
        deadline,
        finalizationPolicy,
        metadataVariableName,
        createdAt,
        finalizedAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    statement.run(
      task.id,
      task.title,
      task.isTest ? 1 : 0,
      task.createdBy,
      task.executionId,
      JSON.stringify(task.inputVariableNames),
      serializeOutputVariableSchemas(task.outputVariableSchemas),
      serializeForm(task.form),
      task.deadline,
      task.finalizationPolicy,
      task.metadataVariableName,
      task.createdAt,
      task.finalizedAt
    );
  }

  public async update(_: AbortSignal, task: Task): Promise<void> {
    const statement = this.db.prepare(`
      UPDATE tasks
      SET finalizedAt = ?
      WHERE id = ?
    `);
    statement.run(task.finalizedAt, task.id);
  }

  public async delete(_: AbortSignal, id: string): Promise<boolean> {
    const statement = this.db.prepare(`
      DELETE FROM tasks
      WHERE id = ?
    `);
    return statement.run(id).changes > 0;
  }
}

function deserializeTask(row: {
  id: string;
  title: string;
  isTest: number;
  createdBy: string;
  executionId: string;
  inputVariableNames: string;
  outputVariableSchemas: string | null;
  form: string | null;
  deadline: number | null;
  finalizationPolicy: string;
  metadataVariableName: string | null;
  createdAt: number;
  finalizedAt: number | null;
}): Task {
  return new Task(
    row.id,
    row.title,
    row.isTest === 1,
    row.createdBy,
    row.executionId,
    JSON.parse(row.inputVariableNames) as string[],
    row.outputVariableSchemas ? (JSON.parse(row.outputVariableSchemas) as Record<string, JsonSchema>) : null,
    row.form ? (JSON.parse(row.form) as FormDefinition) : null,
    row.deadline,
    taskFinalizationPolicySchema.parse(row.finalizationPolicy),
    row.metadataVariableName,
    row.createdAt,
    row.finalizedAt
  );
}

function serializeOutputVariableSchemas(outputVariableSchemas: Record<string, JsonSchema> | null): string | null {
  return outputVariableSchemas ? JSON.stringify(outputVariableSchemas) : null;
}

function serializeForm(form: FormDefinition | null): string | null {
  return form ? JSON.stringify(form) : null;
}
