import { ToolContext } from '@aibindkit/llm';
import assert from 'node:assert/strict';
import test from 'node:test';
import { PersistedExecution } from '../../repositories/persisted-execution/persisted-execution';
import { PersistedExecutionRepository } from '../../repositories/persisted-execution/persisted-execution-repository';
import { Task } from '../../repositories/task/task';
import { TaskInputVariableValuesProvider } from '../../task/task-input-variable-values-provider';
import { UserAssignedTaskProvider } from '../../task/user-assigned-task-provider';
import { ChatSessionId } from '../chat-session-id';
import { GetMyTaskInputVariableValuesTool } from './get-my-task-input-variable-values-tool';

test('returns all task input variable values and no other execution values', async () => {
  const abortSignal = new AbortController().signal;
  const userAssignedTaskProvider = {
    tryGet: async (_: AbortSignal, isTest: boolean, userName: string, taskId: string) => {
      assert.equal(isTest, true);
      assert.equal(userName, 'alice');
      assert.equal(taskId, 'task_1');
      return {
        assignedTask: {},
        task: {
          executionId: 'execution_1',
          inputVariableNames: ['name', 'count']
        } as Task
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
  const provider = new TaskInputVariableValuesProvider(userAssignedTaskProvider, persistedExecutionRepository);
  const tool = new GetMyTaskInputVariableValuesTool(provider);

  const result = await tool.handle(abortSignal, createContext('alice', true), { taskId: 'task_1' });

  assert.deepEqual(result.content, {
    values: {
      name: 'Example',
      count: 3
    }
  });
});

test('returns an error when the task is not assigned to the user', async () => {
  const userAssignedTaskProvider = {
    tryGet: async () => null
  } as unknown as UserAssignedTaskProvider;
  const persistedExecutionRepository = {
    tryGet: async () => assert.fail('execution should not be queried')
  } as unknown as PersistedExecutionRepository;
  const provider = new TaskInputVariableValuesProvider(userAssignedTaskProvider, persistedExecutionRepository);
  const tool = new GetMyTaskInputVariableValuesTool(provider);

  const result = await tool.handle(new AbortController().signal, createContext('alice', false), { taskId: 'missing' });

  assert.deepEqual(result.content, {
    error: 'Task not found'
  });
});

function createContext(userName: string, isTest: boolean): ToolContext {
  return {
    sessionId: ChatSessionId.createUserChannel(userName, isTest, 'default').encode(),
    sessionToken: ''
  };
}
