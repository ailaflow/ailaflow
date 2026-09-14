import { FormDefinition, JsonSchema, taskFinalizationPolicySchema } from '@ailaflow/shared';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { Task } from './task';
import { TaskRepository } from './task-repository';
import { Transaction } from '../../core/transaction';

export class SqliteTaskRepository implements TaskRepository {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal) {
    await this.db.write(db => {
      db.exec(`
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
          finalizationRequestCount INTEGER NOT NULL,
          nextFinalizationAttemptAt INTEGER,
          createdAt INTEGER NOT NULL,
          finalizedAt INTEGER
        ) STRICT
      `);
      db.exec(`
        CREATE INDEX IF NOT EXISTS tasks_execution_id_idx
        ON tasks(executionId)
      `);
    });
  }

  public async tryGet(_: AbortSignal, id: string): Promise<Task | null> {
    return this.db.read(db => {
      const statement = db.prepare(`
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
          finalizationRequestCount,
          nextFinalizationAttemptAt,
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
            finalizationRequestCount: number;
            nextFinalizationAttemptAt: number | null;
            createdAt: number;
            finalizedAt: number | null;
          }
        | undefined;

      return row ? deserializeTask(row) : null;
    });
  }

  public async insert(_: AbortSignal, task: Task, transaction?: Transaction): Promise<void> {
    await this.db.write(db => {
      const statement = db.prepare(`
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
          finalizationRequestCount,
          nextFinalizationAttemptAt,
          createdAt,
          finalizedAt
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        task.finalizationRequestCount,
        task.nextFinalizationAttemptAt,
        task.createdAt,
        task.finalizedAt
      );
    }, transaction);
  }

  public async finalize(_: AbortSignal, id: string, time: number, transaction?: Transaction): Promise<void> {
    await this.db.write(db => {
      const statement = db.prepare(`
        UPDATE tasks
        SET
          finalizedAt = ?,
          finalizationRequestCount = 0
        WHERE id = ?
      `);
      statement.run(time, id);
    }, transaction);
  }

  public async incrementFinalizationRequestCount(_: AbortSignal, id: string, delta: number, transaction?: Transaction): Promise<void> {
    await this.db.write(db => {
      const statement = db.prepare(`
        UPDATE tasks
        SET finalizationRequestCount = finalizationRequestCount + ?
        WHERE id = ?
      `);
      statement.run(delta, id);
    }, transaction);
  }

  public async setNextFinalizationAttemptAt(_: AbortSignal, id: string, time: number, transaction?: Transaction): Promise<void> {
    await this.db.write(db => {
      const statement = db.prepare(`
        UPDATE tasks
        SET nextFinalizationAttemptAt = ?
        WHERE id = ?
      `);
      statement.run(time, id);
    }, transaction);
  }

  public async delete(_: AbortSignal, id: string, transaction?: Transaction): Promise<boolean> {
    return this.db.write(db => {
      const statement = db.prepare(`
        DELETE FROM tasks
        WHERE id = ?
      `);
      return statement.run(id).changes > 0;
    }, transaction);
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
  finalizationRequestCount: number;
  nextFinalizationAttemptAt: number | null;
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
    row.finalizationRequestCount,
    row.nextFinalizationAttemptAt,
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
