import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { TaskFinalizationPolicy, TaskSubmissionMode } from '@ailaflow/shared';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { Task } from './task';
import { SqliteTaskRepository } from './sqlite-task-repository';
import { SqliteAssignedTaskRepository } from './sqlite-assigned-task-repository';
import { AssignedTask } from './assigned-task';

test('task insert does not overwrite an existing task', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { dataDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const repository = new SqliteTaskRepository(dbs);

  await repository.setup(signal);

  await repository.insert(
    signal,
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
      TaskSubmissionMode.TASK_FORM,
      2,
      1500,
      1000,
      null,
      null
    )
  );

  await assert.rejects(() =>
    repository.insert(
      signal,
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
        TaskSubmissionMode.AI_TOOL_OR_TASK_FORM,
        0,
        null,
        2000,
        null,
        null
      )
    )
  );

  const row = {
    ...db
      .prepare(
        `
        SELECT title, isTest, createdBy, executionId, inputVariableNames, outputVariableSchemas, submissionMode, finalizationPolicy, metadataVariableName, finalizationRequestCount, nextFinalizationAttemptAt, createdAt, finalizedAt
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
    submissionMode: string;
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
    submissionMode: TaskSubmissionMode.TASK_FORM,
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
  const dbs = { dataDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
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
    TaskSubmissionMode.TASK_FORM,
    3,
    null,
    1000,
    null,
    null
  );

  await repository.setup(signal);
  await repository.insert(signal, task);
  const rowBeforeUpdate = { ...db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(task.id) };

  await repository.finalize(signal, task.id, 2500);

  assert.deepEqual(
    { ...db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(task.id) },
    {
      ...rowBeforeUpdate,
      finalizationRequestCount: 0,
      inputVariableNames: null,
      metadataVariableName: null,
      outputVariableSchemas: null,
      finalizedAt: 2500
    }
  );
  const finalizedTask = await repository.tryGet(signal, task.id);
  assert.equal(finalizedTask?.finalizationRequestCount, 0);
  assert.equal(finalizedTask?.finalizedAt, 2500);
  assert.deepEqual(finalizedTask?.inputVariableNames, []);
  assert.equal(finalizedTask?.metadataVariableName, null);
  assert.equal(finalizedTask?.outputVariableSchemas, null);

  db.close();
});

test('task can be failed and its stored variable metadata is released', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { dataDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const repository = new SqliteTaskRepository(dbs);
  const task = Task.create(
    'Task',
    false,
    'creator_1',
    'execution_1',
    ['input'],
    { output: { type: 'string' } },
    null,
    null,
    TaskFinalizationPolicy.ALL_ASSIGNEES,
    'taskMetadata',
    TaskSubmissionMode.AI_TOOL_OR_TASK_FORM
  );

  await repository.setup(signal);
  await repository.insert(signal, task);
  await repository.incrementFinalizationRequestCount(signal, task.id, 3);
  await repository.fail(signal, task.id, 2500);

  assert.deepEqual(
    { ...db.prepare(`SELECT * FROM tasks WHERE id = ?`).get(task.id) },
    {
      id: task.id,
      title: task.title,
      isTest: 0,
      createdBy: task.createdBy,
      executionId: task.executionId,
      outputVariableSchemas: null,
      form: null,
      deadline: null,
      finalizationPolicy: TaskFinalizationPolicy.ALL_ASSIGNEES,
      metadataVariableName: null,
      finalizationRequestCount: 0,
      nextFinalizationAttemptAt: null,
      createdAt: task.createdAt,
      finalizedAt: null,
      submissionMode: TaskSubmissionMode.AI_TOOL_OR_TASK_FORM,
      inputVariableNames: null,
      failedAt: 2500
    }
  );
  const failedTask = await repository.tryGet(signal, task.id);
  assert.equal(failedTask?.failedAt, 2500);
  assert.deepEqual(failedTask?.inputVariableNames, []);
  assert.equal(failedTask?.metadataVariableName, null);
  assert.equal(failedTask?.outputVariableSchemas, null);

  db.close();
});

test('task finalization request count can be incremented and decremented', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { dataDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
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
    TaskSubmissionMode.AI_TOOL_OR_TASK_FORM,
    0,
    null,
    1000,
    null,
    null
  );

  await repository.setup(signal);
  await repository.insert(signal, task);
  await repository.incrementFinalizationRequestCount(signal, task.id, 3);
  await repository.incrementFinalizationRequestCount(signal, task.id, -1);

  assert.equal((await repository.tryGet(signal, task.id))?.finalizationRequestCount, 2);

  db.close();
});

test('concurrent task finalization request increments are serialized', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { dataDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const repository = new SqliteTaskRepository(dbs);
  const task = Task.create(
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
    TaskSubmissionMode.AI_TOOL_OR_TASK_FORM
  );

  await repository.setup(signal);
  await repository.insert(signal, task);

  await Promise.all([
    repository.incrementFinalizationRequestCount(signal, task.id, 1),
    repository.incrementFinalizationRequestCount(signal, task.id, 1)
  ]);

  assert.equal((await repository.tryGet(signal, task.id))?.finalizationRequestCount, 2);

  db.close();
});

test('next task finalization attempt can be scheduled', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { dataDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const repository = new SqliteTaskRepository(dbs);
  const task = Task.create(
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
    TaskSubmissionMode.AI_TOOL_OR_TASK_FORM
  );

  await repository.setup(signal);
  await repository.insert(signal, task);
  await repository.setNextFinalizationAttemptAt(signal, task.id, 5000);

  assert.equal((await repository.tryGet(signal, task.id))?.nextFinalizationAttemptAt, 5000);

  db.close();
});

test('task can be fetched by id', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { dataDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
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
    TaskSubmissionMode.TASK_FORM,
    0,
    null,
    1000,
    null,
    3000
  );

  await repository.setup(signal);
  await repository.insert(signal, task);

  assert.deepEqual(await repository.tryGet(signal, 'task_1'), task);
  assert.equal(await repository.tryGet(signal, 'missing'), null);

  db.close();
});

test('task can be deleted with its assignments', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { dataDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const taskRepository = new SqliteTaskRepository(dbs);
  const assignedTaskRepository = new SqliteAssignedTaskRepository(dbs);

  await taskRepository.setup(signal);
  await assignedTaskRepository.setup(signal);
  await taskRepository.insert(
    signal,
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
      TaskSubmissionMode.AI_TOOL_OR_TASK_FORM,
      0,
      null,
      1000,
      null,
      null
    )
  );
  await assignedTaskRepository.upsert(signal, AssignedTask.create('task_1', 'user_1', 'default'));

  assert.equal(await taskRepository.delete(signal, 'task_1'), true);
  assert.equal(await taskRepository.tryGet(signal, 'task_1'), null);
  assert.equal(await assignedTaskRepository.tryGet(signal, 'task_1', 'user_1'), null);
  assert.equal(await taskRepository.delete(signal, 'task_1'), false);

  db.close();
});
