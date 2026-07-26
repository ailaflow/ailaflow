import { ToolContext, ZodTool } from '@aibindkit/llm';
import { MyProcessListQuerier } from '../../queriers/my-process-list/my-process-list-querier';
import { ChatSessionId } from '../chat-session-id';

export class MyProcessesTool extends ZodTool {
  public constructor(private readonly querier: MyProcessListQuerier) {
    super('get_my_processes', 'Returns a list of supported processes');
  }

  public async handle(abortSignal: AbortSignal, { sessionId }: ToolContext) {
    const { userName } = ChatSessionId.decode(sessionId);
    return await this.querier.query(abortSignal, userName);
  }
}
