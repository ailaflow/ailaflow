import { ToolContext, ZodTool } from '@aibindkit/llm';
import { MyProcessListQuerier } from '../../queriers/my-process-list/my-process-list-querier';

export class MyProcessesTool extends ZodTool {
  public constructor(private readonly querier: MyProcessListQuerier) {
    super('get_my_processes', 'Returns a list of supported processes');
  }

  public async handle(abortSignal: AbortSignal, { sessionId }: ToolContext) {
    // TODO
    const userName = sessionId.split(':')[0];

    return await this.querier.query(abortSignal, userName);
  }
}
