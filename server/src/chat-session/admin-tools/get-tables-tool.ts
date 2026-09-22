import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import z from 'zod/v4';
import { TableListQuerier } from '../../queriers/table-list/table-list-querier';

const PAGE_SIZE = 30;

const inputSchema = z.object({
  page: z.number().int().min(1).default(1)
});

type Arg = z.infer<typeof inputSchema>;

export class GetTablesTool extends ZodTool<Arg> {
  public constructor(private readonly querier: TableListQuerier) {
    super('global_get_tables', 'Returns a paginated list of tables in the system', inputSchema);
  }

  public async handle(signal: AbortSignal, _: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    return {
      content: await this.querier.query(signal, arg.page, PAGE_SIZE)
    };
  }
}
