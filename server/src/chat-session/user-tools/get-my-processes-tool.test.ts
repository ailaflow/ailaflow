import { ToolContext } from '@aibindkit/llm';
import { DEFAULT_CHANNEL_NAME, ProcessDisplay, ProcessExecutionMode } from '@ailaflow/shared';
import assert from 'node:assert/strict';
import test from 'node:test';
import { MyProcessListQuerier } from '../../queriers/my-process-list/my-process-list-querier';
import { ChatSessionId } from '../chat-session-id';
import { GetMyProcessesTool } from './get-my-processes-tool';

test('returns the requested page of supported processes', async () => {
  const response = {
    processes: [
      {
        name: 'example',
        description: 'Example process',
        executionMode: ProcessExecutionMode.AI_TOOL_OR_START_FORM
      }
    ],
    totalCount: 31,
    page: 2,
    pageSize: 30
  };
  const querier = {
    query: async (_: AbortSignal, userName: string, page: number, pageSize: number, displayAtLeast: ProcessDisplay) => {
      assert.equal(userName, 'alice');
      assert.equal(page, 2);
      assert.equal(pageSize, 30);
      assert.equal(displayAtLeast, ProcessDisplay.LISTED);
      return response;
    }
  } as MyProcessListQuerier;
  const tool = new GetMyProcessesTool(querier);

  const result = await tool.handle(new AbortController().signal, createContext('alice'), { page: 2 });

  assert.deepEqual(result.content, {
    processes: [{ name: 'example', description: 'Example process', canStartWithAiTool: true }],
    totalCount: 31,
    page: 2,
    pageSize: 30
  });
});

function createContext(userName: string): ToolContext {
  return {
    sessionId: ChatSessionId.createUserChannel(userName, false, DEFAULT_CHANNEL_NAME).encode(),
    sessionToken: ''
  };
}
