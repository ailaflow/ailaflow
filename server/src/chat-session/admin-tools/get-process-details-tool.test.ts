import { ToolContext } from '@aibindkit/llm';
import assert from 'node:assert/strict';
import test from 'node:test';
import { ProcessManager } from '../../process/process-manager';
import { Process } from '../../repositories/process/process';
import { GetProcessDetailsTool } from './get-process-details-tool';

test('returns process details', async () => {
  const processManager = {
    tryGetByName: async (_: AbortSignal, processName: string) => {
      assert.equal(processName, 'example');
      return {
        name: 'example',
        description: 'Example process',
        startVariableSchemas: {
          title: { type: 'string' }
        }
      } as unknown as Process;
    }
  } as ProcessManager;
  const tool = new GetProcessDetailsTool(processManager);

  const result = await tool.handle(new AbortController().signal, createContext(), { processName: 'example' });

  assert.deepEqual(result.content, {
    name: 'example',
    description: 'Example process',
    startVariableSchemas: {
      title: { type: 'string' }
    }
  });
});

test('returns an error when the process does not exist', async () => {
  const processManager = {
    tryGetByName: async () => null
  } as unknown as ProcessManager;
  const tool = new GetProcessDetailsTool(processManager);

  const result = await tool.handle(new AbortController().signal, createContext(), { processName: 'missing' });

  assert.deepEqual(result.content, {
    error: 'Process not found'
  });
});

function createContext(): ToolContext {
  return {
    sessionId: 'admin:admin:default',
    sessionToken: ''
  };
}
