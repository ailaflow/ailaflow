import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { TaskFinalizationPolicy, TaskSubmissionMode } from '@ailaflow/shared';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { AssignedTask } from '../../repositories/task/assigned-task';
import { SqliteAssignedTaskRepository } from '../../repositories/task/sqlite-assigned-task-repository';
import { Task } from '../../repositories/task/task';
import { SqliteTaskRepository } from '../../repositories/task/sqlite-task-repository';
import { SqliteMyTaskListQuerier } from './sqlite-my-task-list-querier';

test('queries tasks assigned to the current user', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { dataDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const taskRepository = new SqliteTaskRepository(dbs);
  const assignedTaskRepository = new SqliteAssignedTaskRepository(dbs);
  const querier = new SqliteMyTaskListQuerier(dbs);

  await taskRepository.setup(signal);
  await assignedTaskRepository.setup(signal);

  await taskRepository.insert(
    signal,
    new Task(
      'task_1',
      'Open outdated',
      false,
      'alice',
      'execution_1',
      [],
      null,
      null,
      4000,
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
  await taskRepository.insert(
    signal,
    new Task(
      'task_2',
      'Open current',
      false,
      'alice',
      'execution_1',
      [],
      null,
      null,
      6000,
      TaskFinalizationPolicy.ALL_ASSIGNEES,
      null,
      TaskSubmissionMode.TASK_FORM,
      0,
      null,
      1001,
      null,
      null
    )
  );
  await taskRepository.insert(
    signal,
    new Task(
      'task_3',
      'Completed outdated',
      false,
      'alice',
      'execution_1',
      [],
      null,
      null,
      3000,
      TaskFinalizationPolicy.ALL_ASSIGNEES,
      null,
      TaskSubmissionMode.AI_TOOL_OR_TASK_FORM,
      0,
      null,
      1002,
      4500,
      null
    )
  );
  await taskRepository.insert(
    signal,
    new Task(
      'task_4',
      'Other user',
      false,
      'bob',
      'execution_1',
      [],
      null,
      null,
      3000,
      TaskFinalizationPolicy.ALL_ASSIGNEES,
      null,
      TaskSubmissionMode.AI_TOOL_OR_TASK_FORM,
      0,
      null,
      1003,
      null,
      null
    )
  );
  await taskRepository.insert(
    signal,
    new Task(
      'task_5',
      'No deadline',
      false,
      'alice',
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
      1004,
      null,
      null
    )
  );
  await taskRepository.insert(
    signal,
    new Task(
      'task_6',
      'Test task',
      true,
      'alice',
      'execution_2',
      [],
      null,
      null,
      null,
      TaskFinalizationPolicy.ALL_ASSIGNEES,
      null,
      TaskSubmissionMode.AI_TOOL_OR_TASK_FORM,
      0,
      null,
      1005,
      null,
      null
    )
  );
  await taskRepository.insert(
    signal,
    new Task(
      'task_7',
      'Failed task',
      false,
      'alice',
      'execution_1',
      [],
      null,
      null,
      null,
      TaskFinalizationPolicy.ALL_ASSIGNEES,
      null,
      TaskSubmissionMode.AI_TOOL_OR_TASK_FORM,
      1,
      null,
      1006,
      null,
      5000
    )
  );

  await assignedTaskRepository.upsertMultiple(signal, [
    AssignedTask.create('task_1', 'alice', 'default'),
    AssignedTask.create('task_2', 'alice', 'default'),
    AssignedTask.create('task_3', 'alice', 'default'),
    AssignedTask.create('task_4', 'bob', 'default'),
    new AssignedTask('task_5', 'alice', 'default', 4700, null),
    AssignedTask.create('task_6', 'alice', 'default'),
    AssignedTask.create('task_7', 'alice', 'default')
  ]);

  assert.deepEqual(await querier.query(signal, false, 'alice', false, 1, 2), {
    tasks: [
      {
        id: 'task_1',
        title: 'Open outdated',
        submissionMode: TaskSubmissionMode.AI_TOOL_OR_TASK_FORM,
        createdAt: 1000,
        deadline: 4000
      },
      {
        id: 'task_2',
        title: 'Open current',
        submissionMode: TaskSubmissionMode.TASK_FORM,
        createdAt: 1001,
        deadline: 6000
      }
    ],
    totalCount: 4,
    page: 1,
    pageSize: 2
  });
  assert.deepEqual(await querier.query(signal, false, 'alice', false, 2, 2), {
    tasks: [
      {
        id: 'task_3',
        title: 'Completed outdated',
        submissionMode: TaskSubmissionMode.AI_TOOL_OR_TASK_FORM,
        createdAt: 1002,
        completedAt: 4500,
        deadline: 3000
      },
      {
        id: 'task_5',
        title: 'No deadline',
        submissionMode: TaskSubmissionMode.AI_TOOL_OR_TASK_FORM,
        createdAt: 1004,
        completedAt: 4700
      }
    ],
    totalCount: 4,
    page: 2,
    pageSize: 2
  });
  assert.deepEqual(await querier.query(signal, false, 'alice', true, 1, 20), {
    tasks: [
      {
        id: 'task_1',
        title: 'Open outdated',
        submissionMode: TaskSubmissionMode.AI_TOOL_OR_TASK_FORM,
        createdAt: 1000,
        deadline: 4000
      },
      {
        id: 'task_2',
        title: 'Open current',
        submissionMode: TaskSubmissionMode.TASK_FORM,
        createdAt: 1001,
        deadline: 6000
      }
    ],
    totalCount: 2,
    page: 1,
    pageSize: 20
  });
  assert.deepEqual(await querier.query(signal, true, 'alice', false, 1, 20), {
    tasks: [
      {
        id: 'task_6',
        title: 'Test task',
        submissionMode: TaskSubmissionMode.AI_TOOL_OR_TASK_FORM,
        createdAt: 1005
      }
    ],
    totalCount: 1,
    page: 1,
    pageSize: 20
  });

  db.close();
});
