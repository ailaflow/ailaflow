import { TaskSubmissionMode } from '@ailaflow/shared';
import assert from 'node:assert/strict';
import test from 'node:test';
import { AssignedTask } from '../repositories/task/assigned-task';
import { AssignedTaskRepository } from '../repositories/task/assigned-task-repository';
import { Task } from '../repositories/task/task';
import { TaskRepository } from '../repositories/task/task-repository';
import { UserChatSessionProvider } from '../chat-session/user-chat-session-provider';
import { AssignedTaskCompleter, AssignedTaskCompleterError } from './assigned-task-completer';
import { TaskFinalizationWorker } from './task-finalization-worker';
import { UserAssignedTaskProvider } from './user-assigned-task-provider';

test('rejects AI tool submission for a task-form-only task after one task lookup', async () => {
  let lookupCount = 0;
  const provider = {
    tryGetCompletable: async () => {
      lookupCount++;
      return {
        assignedTask: {} as AssignedTask,
        task: { submissionMode: TaskSubmissionMode.TASK_FORM } as Task
      };
    }
  } as unknown as UserAssignedTaskProvider;
  const chatSessionProvider = {
    get: async () => assert.fail('chat session should not be queried')
  } as unknown as UserChatSessionProvider;
  const completer = new AssignedTaskCompleter(
    provider,
    chatSessionProvider,
    {} as AssignedTaskRepository,
    {} as TaskRepository,
    {} as TaskFinalizationWorker
  );

  await assert.rejects(
    () => completer.complete(new AbortController().signal, false, 'alice', 'task_1', {}, true),
    error =>
      error instanceof AssignedTaskCompleterError &&
      error.message === 'This task cannot be submitted using an AI tool. Use its task form instead.'
  );
  assert.equal(lookupCount, 1);
});
