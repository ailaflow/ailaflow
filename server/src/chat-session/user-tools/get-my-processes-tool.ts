import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import { MyProcessLiteDto } from '@aila/model';
import { MyProcessListQuerier } from '../../queriers/my-process-list/my-process-list-querier';
import { ChatSessionId } from '../chat-session-id';

export class GetMyProcessesTool extends ZodTool {
  public constructor(private readonly querier: MyProcessListQuerier) {
    super('get_my_processes', 'Returns a list of supported processes');
  }

  public async handle(abortSignal: AbortSignal, { sessionId }: ToolContext): Promise<ZodToolExecutionResult> {
    const { userName } = ChatSessionId.decode(sessionId);
    return {
      content: await this.queryAll(abortSignal, userName)
    };
  }

  private async queryAll(abortSignal: AbortSignal, userName: string): Promise<MyProcessLiteDto[]> {
    const pageSize = 100;
    const processes: MyProcessLiteDto[] = [];

    for (let page = 1; ; page++) {
      const result = await this.querier.query(abortSignal, userName, page, pageSize);
      processes.push(...result.processes);

      if (processes.length >= result.totalCount || result.processes.length === 0) {
        return processes;
      }
    }
  }
}
