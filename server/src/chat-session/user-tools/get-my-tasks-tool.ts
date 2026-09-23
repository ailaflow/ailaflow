import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import z from 'zod/v4';
import { MyTaskListQuerier } from '../../queriers/my-task-list/my-task-list-querier';
import { ChatSessionId } from '../chat-session-id';
import { TaskSubmissionMode } from '@ailaflow/shared';

const PAGE_SIZE = 30;

const inputSchema = z.object({
  page: z.number().int().min(1).default(1),
  onlyOpen: z.boolean().default(true)
});

type Arg = z.infer<typeof inputSchema>;

export class GetMyTasksTool extends ZodTool<Arg> {
  public constructor(private readonly querier: MyTaskListQuerier) {
    super(
      'get_my_tasks',
      'Returns a paginated list of tasks assigned to the user. Set onlyOpen to false to include completed tasks.',
      inputSchema
    );
  }

  public async handle(signal: AbortSignal, { sessionId }: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    const chatSessionId = ChatSessionId.decode(sessionId);
    const response = await this.querier.query(signal, chatSessionId.isTest(), chatSessionId.userName, arg.onlyOpen, arg.page, PAGE_SIZE);
    return {
      content: {
        tasks: response.tasks.map(task => ({
          id: task.id,
          title: task.title,
          createdAt: new Date(task.createdAt).toISOString(),
          completedAt: task.completedAt ? new Date(task.completedAt).toISOString() : undefined,
          deadline: task.deadline === undefined ? undefined : new Date(task.deadline).toISOString(),
          canSubmitWithAiTool: task.submissionMode === TaskSubmissionMode.AI_TOOL_OR_TASK_FORM
        })),
        page: response.page,
        pageSize: response.pageSize,
        totalCount: response.totalCount
      }
    };
  }
}
