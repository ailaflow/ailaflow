import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import * as z from 'zod/v4';
import { ProcessListQuerier } from '../../queriers/process-list/process-list-querier';
import { ProcessDisplay, ProcessExecutionMode } from '@ailaflow/shared';

const PAGE_SIZE = 30;

const inputSchema = z.object({
  page: z.number().int().min(1).default(1)
});

type Arg = z.infer<typeof inputSchema>;

export class GetProcessesTool extends ZodTool<Arg> {
  public constructor(private readonly querier: ProcessListQuerier) {
    super('global_get_processes', 'Returns a paginated list of processes in the system', inputSchema);
  }

  public async handle(signal: AbortSignal, _: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    const response = await this.querier.query(signal, arg.page, PAGE_SIZE, ProcessDisplay.LISTED);
    return {
      content: {
        processes: response.processes.map(p => ({
          name: p.name,
          description: p.description,
          nTasksSteps: p.nTasksSteps,
          userAccessExpression: p.userAccessExpression,
          canStartWithAiTool: p.executionMode === ProcessExecutionMode.AI_TOOL_OR_START_FORM
        })),
        page: response.page,
        pageSize: response.pageSize,
        totalCount: response.totalCount
      }
    };
  }
}
