import { ToolContext } from '@aibindkit/llm';
import { DEFAULT_CHANNEL_NAME } from '@ailaflow/shared';
import assert from 'node:assert/strict';
import test from 'node:test';
import { AssignedTaskCompleter, AssignedTaskCompleterError } from '../../task/assigned-task-completer';
import { ChatSessionId } from '../chat-session-id';
import { SubmitMyTaskTool } from './submit-my-task-tool';

test('rejects AI submission when a task only supports its form', async () => {
  const completer = {
    complete: async (_: AbortSignal, __: boolean, ___: string, ____: string, _____: unknown, isAiTool: boolean) => {
      assert.equal(isAiTool, true);
      throw new AssignedTaskCompleterError('This task cannot be submitted using an AI tool. Use its task form instead.');
    }
  } as unknown as AssignedTaskCompleter;
  const tool = new SubmitMyTaskTool(completer);

  const result = await tool.handle(new AbortController().signal, createContext(), {
    taskId: 'task_1',
    outputVariableValues: {}
  });

  assert.deepEqual(result.content, {
    error: 'This task cannot be submitted using an AI tool. Use its task form instead.'
  });
});

test('submits a task that supports the AI tool', async () => {
  let completed = false;
  const completer = {
    complete: async (_: AbortSignal, isTest: boolean, userName: string, taskId: string, outputValues: unknown, isAiTool: boolean) => {
      assert.equal(isTest, false);
      assert.equal(userName, 'alice');
      assert.equal(taskId, 'task_1');
      assert.deepEqual(outputValues, { approved: true });
      assert.equal(isAiTool, true);
      completed = true;
    }
  } as unknown as AssignedTaskCompleter;
  const tool = new SubmitMyTaskTool(completer);

  const result = await tool.handle(new AbortController().signal, createContext(), {
    taskId: 'task_1',
    outputVariableValues: { approved: true }
  });

  assert.equal(completed, true);
  assert.deepEqual(result.content, { success: true });
});

function createContext(): ToolContext {
  return {
    sessionId: ChatSessionId.createUserChannel('alice', false, DEFAULT_CHANNEL_NAME).encode(),
    sessionToken: ''
  };
}
