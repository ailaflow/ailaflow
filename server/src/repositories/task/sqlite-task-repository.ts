import { DatabaseSync } from 'node:sqlite';
import { FormDefinition, JsonSchema, taskFinalizationPolicySchema } from '@ailaflow/shared';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { Task } from './task';
import { TaskRepository } from './task-repository';
import { Transaction } from '../../core/transaction';
import { SqliteTransaction } from '../../core/sqlite-transaction';
import { AsyncMutex } from '../../core/async-mutex';

export class SqliteTaskRepository implements TaskRepository {
  private readonly db: DatabaseSync;
  private readonly dbMutex: AsyncMutex;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
    this.dbMutex = dbs.modelDbMutex;
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
        finalizationRequestCount INTEGER NOT NULL,
        nextFinalizationAttemptAt INTEGER,
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
  }

  public async finalize(_: AbortSignal, id: string, time: number): Promise<void> {
    const statement = this.db.prepare(`
      UPDATE tasks
      SET
        finalizedAt = ?,
        finalizationRequestCount = 0
      WHERE id = ?
    `);
    statement.run(time, id);
  }

  public async incrementFinalizationRequestCount(_: AbortSignal, id: string, delta: number, transaction?: Transaction): Promise<void> {
    const t = await SqliteTransaction.begin(this.db, this.dbMutex, transaction);
    try {
      const statement = this.db.prepare(`
      UPDATE tasks
      SET finalizationRequestCount = finalizationRequestCount + ?
      WHERE id = ?
    `);
      statement.run(delta, id);
      await t.commit();
    } catch (e) {
      await t.rollback();
      throw e;
    }
  }

  public async setNextFinalizationAttemptAt(_: AbortSignal, id: string, time: number): Promise<void> {
    const statement = this.db.prepare(`
      UPDATE tasks
      SET nextFinalizationAttemptAt = ?
      WHERE id = ?
    `);
    statement.run(time, id);
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
