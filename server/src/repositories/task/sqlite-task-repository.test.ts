import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { Task } from './task';
import { SqliteTaskRepository } from './sqlite-task-repository';

test('task insert does not overwrite an existing task', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteTaskRepository(dbs);

  await repository.setup(abortSignal);

  await repository.insert(abortSignal, new Task('task_1', 'Original task', 'execution_1', [], [], null, null, 1000));

  await assert.rejects(() =>
    repository.insert(abortSignal, new Task('task_1', 'Changed task', 'execution_2', ['input'], ['output'], null, null, 2000))
  );

  const row = {
    ...db
      .prepare(
        `
        SELECT title, executionId, inputVariableNames, outputVariableNames, createdAt
        FROM tasks
        WHERE id = ?
      `
      )
      .get('task_1')
  } as {
    title: string;
    executionId: string;
    inputVariableNames: string;
    outputVariableNames: string;
    createdAt: number;
  };
  assert.deepEqual(row, {
    title: 'Original task',
    executionId: 'execution_1',
    inputVariableNames: '[]',
    outputVariableNames: '[]',
    createdAt: 1000
  });

  db.close();
});
