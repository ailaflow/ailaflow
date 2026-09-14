import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { TaskFinalizationPolicy } from '@ailaflow/shared';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { Task } from './task';
import { SqliteTaskRepository } from './sqlite-task-repository';
import { SqliteAssignedTaskRepository } from './sqlite-assigned-task-repository';
import { AssignedTask } from './assigned-task';
import { SqliteUserRepository } from '../user/sqlite-user-repository';
import { User } from '../user/user';

test('task insert does not overwrite an existing task', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteTaskRepository(dbs);

  await repository.setup(abortSignal);

  await repository.insert(
    abortSignal,
    new Task(
      'task_1',
      'Original task',
      true,
      'creator_1',
      'execution_1',
      [],
      null,
      null,
      null,
      TaskFinalizationPolicy.ALL_ASSIGNEES,
      'originalMetadata',
      2,
      1500,
      1000,
      null
    )
  );

  await assert.rejects(() =>
    repository.insert(
      abortSignal,
      new Task(
        'task_1',
        'Changed task',
        false,
        'creator_2',
        'execution_2',
        ['input'],
        { output: { type: 'string' } },
        null,
        null,
        TaskFinalizationPolicy.ANY_ASSIGNEE,
        null,
        0,
        null,
        2000,
        null
      )
    )
  );

  const row = {
    ...db
      .prepare(
        `
        SELECT title, isTest, createdBy, executionId, inputVariableNames, outputVariableSchemas, finalizationPolicy, metadataVariableName, finalizationRequestCount, nextFinalizationAttemptAt, createdAt, finalizedAt
        FROM tasks
        WHERE id = ?
      `
      )
      .get('task_1')
  } as {
    title: string;
    isTest: number;
    createdBy: string;
    executionId: string;
    inputVariableNames: string;
    outputVariableSchemas: string | null;
    finalizationPolicy: string;
    metadataVariableName: string | null;
    finalizationRequestCount: number;
    nextFinalizationAttemptAt: number | null;
    createdAt: number;
    finalizedAt: number | null;
  };
  assert.deepEqual(row, {
    title: 'Original task',
    isTest: 1,
    createdBy: 'creator_1',
    executionId: 'execution_1',
    inputVariableNames: '[]',
    outputVariableSchemas: null,
    finalizationPolicy: TaskFinalizationPolicy.ALL_ASSIGNEES,
    metadataVariableName: 'originalMetadata',
    finalizationRequestCount: 2,
    nextFinalizationAttemptAt: 1500,
    createdAt: 1000,
    finalizedAt: null
  });

  db.close();
});

test('task can be finalized', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteTaskRepository(dbs);
  const task = new Task(
    'task_1',
    'Task',
    true,
    'creator_1',
    'execution_1',
    ['input'],
    { output: { type: 'string' } },
    null,
    2000,
    TaskFinalizationPolicy.ANY_ASSIGNEE,
    'taskMetadata',
    3,
    null,
    1000,
    null
  );

  await repository.setup(abortSignal);
  await repository.insert(abortSignal, task);
  const rowBeforeUpdate = { ...db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(task.id) };

  await repository.finalize(abortSignal, task.id, 2500);

  assert.deepEqual(
    { ...db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(task.id) },
    {
      ...rowBeforeUpdate,
      finalizationRequestCount: 0,
      finalizedAt: 2500
    }
  );
  const finalizedTask = await repository.tryGet(abortSignal, task.id);
  assert.equal(finalizedTask?.finalizationRequestCount, 0);
  assert.equal(finalizedTask?.finalizedAt, 2500);

  db.close();
});

test('task finalization request count can be incremented and decremented', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteTaskRepository(dbs);
  const task = new Task(
    'task_1',
    'Task',
    false,
    'creator_1',
    'execution_1',
    [],
    null,
    null,
    null,
    TaskFinalizationPolicy.ALL_ASSIGNEES,
    null,
    0,
    null,
    1000,
    null
  );

  await repository.setup(abortSignal);
  await repository.insert(abortSignal, task);
  await repository.incrementFinalizationRequestCount(abortSignal, task.id, 3);
  await repository.incrementFinalizationRequestCount(abortSignal, task.id, -1);

  assert.equal((await repository.tryGet(abortSignal, task.id))?.finalizationRequestCount, 2);

  db.close();
});

test('concurrent task finalization request increments are serialized', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteTaskRepository(dbs);
  const task = Task.create('Task', false, 'creator_1', 'execution_1', [], null, null, null, TaskFinalizationPolicy.ALL_ASSIGNEES, null);

  await repository.setup(abortSignal);
  await repository.insert(abortSignal, task);

  await Promise.all([
    repository.incrementFinalizationRequestCount(abortSignal, task.id, 1),
    repository.incrementFinalizationRequestCount(abortSignal, task.id, 1)
  ]);

  assert.equal((await repository.tryGet(abortSignal, task.id))?.finalizationRequestCount, 2);

  db.close();
});

test('next task finalization attempt can be scheduled', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteTaskRepository(dbs);
  const task = Task.create('Task', false, 'creator_1', 'execution_1', [], null, null, null, TaskFinalizationPolicy.ALL_ASSIGNEES, null);

  await repository.setup(abortSignal);
  await repository.insert(abortSignal, task);
  await repository.setNextFinalizationAttemptAt(abortSignal, task.id, 5000);

  assert.equal((await repository.tryGet(abortSignal, task.id))?.nextFinalizationAttemptAt, 5000);

  db.close();
});

test('task can be fetched by id', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const repository = new SqliteTaskRepository(dbs);
  const task = new Task(
    'task_1',
    'Task form',
    true,
    'creator_1',
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
    TaskFinalizationPolicy.ANY_ASSIGNEE,
    'taskMetadata',
    0,
    null,
    1000,
    null
  );

  await repository.setup(abortSignal);
  await repository.insert(abortSignal, task);

  assert.deepEqual(await repository.tryGet(abortSignal, 'task_1'), task);
  assert.equal(await repository.tryGet(abortSignal, 'missing'), null);

  db.close();
});

test('task can be deleted with its assignments', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const userRepository = new SqliteUserRepository(dbs);
  const taskRepository = new SqliteTaskRepository(dbs);
  const assignedTaskRepository = new SqliteAssignedTaskRepository(dbs);

  await userRepository.setup(abortSignal);
  await taskRepository.setup(abortSignal);
  await assignedTaskRepository.setup(abortSignal);
  await userRepository.insert(abortSignal, new User('user_1', 'hash', false));
  await taskRepository.insert(
    abortSignal,
    new Task(
      'task_1',
      'Task',
      false,
      'creator_1',
      'execution_1',
      [],
      null,
      null,
      null,
      TaskFinalizationPolicy.ALL_ASSIGNEES,
      null,
      0,
      null,
      1000,
      null
    )
  );
  await assignedTaskRepository.upsert(abortSignal, AssignedTask.create('task_1', 'user_1', 'default'));

  assert.equal(await taskRepository.delete(abortSignal, 'task_1'), true);
  assert.equal(await taskRepository.tryGet(abortSignal, 'task_1'), null);
  assert.equal(await assignedTaskRepository.tryGet(abortSignal, 'task_1', 'user_1'), null);
  assert.equal(await taskRepository.delete(abortSignal, 'task_1'), false);

  db.close();
});
