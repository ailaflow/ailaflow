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

  await repository.insert(abortSignal, new Task('task_1', 'Original task', 'execution_1', [], null, null, null, 1000));

  await assert.rejects(() =>
    repository.insert(
      abortSignal,
      new Task('task_1', 'Changed task', 'execution_2', ['input'], { output: { type: 'string' } }, null, null, 2000)
    )
  );

  const row = {
    ...db
      .prepare(
        `
        SELECT title, executionId, inputVariableNames, outputVariableSchemas, createdAt
        FROM tasks
        WHERE id = ?
      `
      )
      .get('task_1')
  } as {
    title: string;
    executionId: string;
    inputVariableNames: string;
    outputVariableSchemas: string | null;
    createdAt: number;
  };
  assert.deepEqual(row, {
    title: 'Original task',
    executionId: 'execution_1',
    inputVariableNames: '[]',
    outputVariableSchemas: null,
    createdAt: 1000
  });

  db.close();
});

test('task can be fetched by id', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: db } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteTaskRepository(dbs);
  const task = new Task(
    'task_1',
    'Task form',
    'execution_1',
    ['input'],
    { output: { type: 'string' } },
    {
      css: '',
      html: '<form></form>',
      js: '',
      inputExamples: []
    },
    2000,
    1000
  );

  await repository.setup(abortSignal);
  await repository.insert(abortSignal, task);

  assert.deepEqual(await repository.tryGet(abortSignal, 'task_1'), task);
  assert.equal(await repository.tryGet(abortSignal, 'missing'), null);

  db.close();
});
