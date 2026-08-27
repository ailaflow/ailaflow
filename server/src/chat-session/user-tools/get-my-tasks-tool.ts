import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import z from 'zod/v4';
import { MyTaskListQuerier } from '../../queriers/my-task-list/my-task-list-querier';
import { ChatSessionId } from '../chat-session-id';

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

  public async handle(abortSignal: AbortSignal, { sessionId }: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    const chatSessionId = ChatSessionId.decode(sessionId);
    return {
      content: await this.querier.query(abortSignal, chatSessionId.isTest(), chatSessionId.userName, arg.onlyOpen, arg.page, PAGE_SIZE)
    };
  }
}
