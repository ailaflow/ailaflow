import { ToolContext } from '@aibindkit/llm';
import { DEFAULT_CHANNEL_NAME } from '@ailaflow/shared';
import assert from 'node:assert/strict';
import test from 'node:test';
import { Task } from '../../repositories/task/task';
import { UserAssignedTaskProvider } from '../../task/user-assigned-task-provider';
import { ChatSessionId } from '../chat-session-id';
import { OpenMyTaskFormTool } from './open-my-task-form-tool';

test('opens the form for a task assigned to the user', async () => {
  const provider = {
    tryGetCompletable: async (_: AbortSignal, isTest: boolean, userName: string, taskId: string) => {
      assert.equal(isTest, true);
      assert.equal(userName, 'alice');
      assert.equal(taskId, 'task_1');
      return {
        assignedTask: {},
        task: { id: 'task_1' } as Task
      };
    }
  } as UserAssignedTaskProvider;
  const tool = new OpenMyTaskFormTool(provider);

  const result = await tool.execute(new AbortController().signal, createContext('alice', true), {
    id: 'call_1',
    type: 'function',
    function: {
      name: 'open_my_task_form',
      arguments: JSON.stringify({ taskId: 'task_1' })
    }
  });

  assert.deepEqual(JSON.parse(result.content), {
    success: 'The task form is displayed after this message. This form is visible only by the user.'
  });
  assert.deepEqual(result.metadata, {
    taskForm: {
      id: 'task_1'
    }
  });
});

test('returns an error when the task is not available to the user', async () => {
  const provider = {
    tryGetCompletable: async () => null
  } as unknown as UserAssignedTaskProvider;
  const tool = new OpenMyTaskFormTool(provider);

  const result = await tool.execute(new AbortController().signal, createContext('alice', false), {
    id: 'call_1',
    type: 'function',
    function: {
      name: 'open_my_task_form',
      arguments: JSON.stringify({ taskId: 'missing' })
    }
  });

  assert.deepEqual(JSON.parse(result.content), {
    error: 'Task not found'
  });
  assert.equal(result.metadata, undefined);
});

function createContext(userName: string, isTest: boolean): ToolContext {
  return {
    sessionId: ChatSessionId.createUserChannel(userName, isTest, DEFAULT_CHANNEL_NAME).encode(),
    sessionToken: ''
  };
}
