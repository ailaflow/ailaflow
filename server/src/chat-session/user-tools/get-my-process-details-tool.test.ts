import { ToolContext } from '@aibindkit/llm';
import { DEFAULT_CHANNEL_NAME } from '@ailaflow/shared';
import assert from 'node:assert/strict';
import test from 'node:test';
import { UserProcessProvider } from '../../process/user-process-provider';
import { Process } from '../../repositories/process/process';
import { ChatSessionId } from '../chat-session-id';
import { GetMyProcessDetailsTool } from './get-my-process-details-tool';

test('returns details for an accessible process', async () => {
  const userProcessProvider = {
    tryGet: async (_: AbortSignal, userName: string, processName: string) => {
      assert.equal(userName, 'alice');
      assert.equal(processName, 'example');
      return {
        name: 'example',
        description: 'Example process',
        startVariableSchemas: {
          title: { type: 'string' }
        }
      } as unknown as Process;
    }
  } as UserProcessProvider;
  const tool = new GetMyProcessDetailsTool(userProcessProvider);

  const result = await tool.handle(new AbortController().signal, createContext('alice'), { processName: 'example' });

  assert.deepEqual(result.content, {
    name: 'example',
    description: 'Example process',
    startVariableSchemas: {
      title: { type: 'string' }
    }
  });
});

test('returns an error when the process is unavailable', async () => {
  const userProcessProvider = {
    tryGet: async () => null
  } as unknown as UserProcessProvider;
  const tool = new GetMyProcessDetailsTool(userProcessProvider);

  const result = await tool.handle(new AbortController().signal, createContext('alice'), { processName: 'missing' });

  assert.deepEqual(result.content, {
    error: 'Process not found'
  });
});

function createContext(userName: string): ToolContext {
  return {
    sessionId: ChatSessionId.createUserChannel(userName, false, DEFAULT_CHANNEL_NAME).encode(),
    sessionToken: ''
  };
}
