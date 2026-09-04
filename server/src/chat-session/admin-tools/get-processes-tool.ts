import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import z from 'zod/v4';
import { ProcessListQuerier } from '../../queriers/process-list/process-list-querier';

const PAGE_SIZE = 30;

const inputSchema = z.object({
  page: z.number().int().min(1).default(1)
});

type Arg = z.infer<typeof inputSchema>;

export class GetProcessesTool extends ZodTool<Arg> {
  public constructor(private readonly querier: ProcessListQuerier) {
    super('global_get_processes', 'Returns a paginated list of processes in the system', inputSchema);
  }

  public async handle(abortSignal: AbortSignal, _: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    return {
      content: await this.querier.query(abortSignal, arg.page, PAGE_SIZE)
    };
  }
}
