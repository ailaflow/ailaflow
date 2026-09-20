import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import { ProcessDisplay } from '@ailaflow/shared';
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

  public async handle(abortSignal: AbortSignal, { sessionId }: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    const { userName } = ChatSessionId.decode(sessionId);
    return {
      content: await this.querier.query(abortSignal, userName, arg.page, PAGE_SIZE, ProcessDisplay.LISTED)
    };
  }
}
