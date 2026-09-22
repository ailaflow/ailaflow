import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import { ProcessDisplay, ProcessExecutionMode } from '@ailaflow/shared';
import z from 'zod/v4';
import { MyProcessListQuerier } from '../../queriers/my-process-list/my-process-list-querier';
import { ChatSessionId } from '../chat-session-id';

const PAGE_SIZE = 30;

const inputSchema = z.object({
  page: z.number().int().min(1).default(1)
});

type Arg = z.infer<typeof inputSchema>;

export class GetMyProcessesTool extends ZodTool<Arg> {
  public constructor(private readonly querier: MyProcessListQuerier) {
    super('get_my_processes', 'Returns a paginated list of supported processes', inputSchema);
  }

  public async handle(signal: AbortSignal, { sessionId }: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    const { userName } = ChatSessionId.decode(sessionId);
    const response = await this.querier.query(signal, userName, arg.page, PAGE_SIZE, ProcessDisplay.LISTED);
    return {
      content: {
        page: response.page,
        pageSize: response.pageSize,
        totalCount: response.totalCount,
        processes: response.processes.map(p => ({
          name: p.name,
          description: p.description,
          canStartWithAiTool: p.executionMode === ProcessExecutionMode.AI_TOOL_OR_START_FORM
        }))
      }
    };
  }
}
