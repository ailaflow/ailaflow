import { ToolContext } from '@aibindkit/llm';
import { TaskSubmissionMode } from '@ailaflow/shared';
import assert from 'node:assert/strict';
import test from 'node:test';
import { MyTaskListQuerier } from '../../queriers/my-task-list/my-task-list-querier';
import { ChatSessionId } from '../chat-session-id';
import { GetMyTasksTool } from './get-my-tasks-tool';

test('maps task submission modes to AI tool capabilities', async () => {
  const querier = {
    query: async () => ({
      tasks: [
        {
          id: 'task_1',
          title: 'AI task',
          submissionMode: TaskSubmissionMode.AI_TOOL_OR_TASK_FORM,
          createdAt: 1000,
          deadline: 3000
        },
        {
          id: 'task_2',
          title: 'Form task',
          submissionMode: TaskSubmissionMode.TASK_FORM,
          createdAt: 2000
        }
      ],
      page: 1,
      pageSize: 30,
      totalCount: 2
    })
  } as MyTaskListQuerier;
  const tool = new GetMyTasksTool(querier);

  const result = await tool.handle(new AbortController().signal, createContext(), { page: 1, onlyOpen: true });

  assert.deepEqual(result.content, {
    tasks: [
      {
        id: 'task_1',
        title: 'AI task',
        createdAt: '1970-01-01T00:00:01.000Z',
        completedAt: undefined,
        deadline: '1970-01-01T00:00:03.000Z',
        canSubmitWithAiTool: true
      },
      {
        id: 'task_2',
        title: 'Form task',
        createdAt: '1970-01-01T00:00:02.000Z',
        completedAt: undefined,
        deadline: undefined,
        canSubmitWithAiTool: false
      }
    ],
    page: 1,
    pageSize: 30,
    totalCount: 2
  });
});

function createContext(): ToolContext {
  return {
    sessionId: ChatSessionId.createUserChannel('alice', false, 'default').encode(),
    sessionToken: ''
  };
}
