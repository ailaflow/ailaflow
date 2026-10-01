import { ToolContext } from '@aibindkit/llm';
import { DEFAULT_CHANNEL_NAME } from '@ailaflow/shared';
import assert from 'node:assert/strict';
import test from 'node:test';
import { PersistedExecution } from '../../repositories/persisted-execution/persisted-execution';
import { PersistedExecutionRepository } from '../../repositories/persisted-execution/persisted-execution-repository';
import { Task } from '../../repositories/task/task';
import { UserAssignedTaskProvider } from '../../task/user-assigned-task-provider';
import { UserTaskDetailsProvider } from '../../task/user-task-details-provider';
import { ChatSessionId } from '../chat-session-id';
import { GetMyTaskDetailsTool } from './get-my-task-details-tool';

test('returns all task input values, output schemas, and no other execution values', async () => {
  const signal = new AbortController().signal;
  const userAssignedTaskProvider = {
    tryGetCompletable: async (_: AbortSignal, isTest: boolean, userName: string, taskId: string) => {
      assert.equal(isTest, true);
      assert.equal(userName, 'alice');
      assert.equal(taskId, 'task_1');
      return {
        assignedTask: {},
        task: {
          title: 'Task',
          executionId: 'execution_1',
          inputVariableNames: ['name', 'count'],
          outputVariableSchemas: {
            approved: { type: 'boolean' }
          }
        } as unknown as Task
      };
    }
  } as UserAssignedTaskProvider;
  const persistedExecutionRepository = {
    tryGet: async (_: AbortSignal, executionId: string) => {
      assert.equal(executionId, 'execution_1');
      return {
        state: {
          context: {
            globalState: {
              variableValues: {
                name: 'Example',
                count: 3,
                privateValue: 'not exposed'
              }
            }
          }
        }
      } as unknown as PersistedExecution;
    }
  } as PersistedExecutionRepository;
  const provider = new UserTaskDetailsProvider(userAssignedTaskProvider, persistedExecutionRepository);
  const tool = new GetMyTaskDetailsTool(provider);

  const result = await tool.handle(signal, createContext('alice', true), { taskId: 'task_1' });

  assert.deepEqual(result.content, {
    title: 'Task',
    inputValues: {
      name: 'Example',
      count: 3
    },
    outputVariableSchemas: {
      approved: { type: 'boolean' }
    }
  });
});

test('returns an error when the task is not assigned to the user', async () => {
  const userAssignedTaskProvider = {
    tryGetCompletable: async () => null
  } as unknown as UserAssignedTaskProvider;
  const persistedExecutionRepository = {
    tryGet: async () => assert.fail('execution should not be queried')
  } as unknown as PersistedExecutionRepository;
  const provider = new UserTaskDetailsProvider(userAssignedTaskProvider, persistedExecutionRepository);
  const tool = new GetMyTaskDetailsTool(provider);

  const result = await tool.handle(new AbortController().signal, createContext('alice', false), { taskId: 'missing' });

  assert.deepEqual(result.content, {
    error: 'Task not found'
  });
});

function createContext(userName: string, isTest: boolean): ToolContext {
  return {
    sessionId: ChatSessionId.createUserChannel(userName, isTest, DEFAULT_CHANNEL_NAME).encode(),
    sessionToken: ''
  };
}
