import type { ToolCall, ToolDescriptor } from '@aibindkit/core';
import { Tool } from '@aibindkit/llm';
import { MyProcessListQuerier } from '../../queriers/my-process-list/my-process-list-querier';

export class MyProcessesTool implements Tool {
  public readonly descriptor: ToolDescriptor = {
    type: 'function',
    function: {
      name: 'get_my_processes',
      description: 'Returns a list of processes that the user can run'
    }
  };

  public constructor(private readonly querier: MyProcessListQuerier) {}

  public async execute(abortSignal: AbortSignal, _: ToolCall, sessionId: string) {
    // TODO
    const userId = sessionId.split(':')[0];

    const processes = await this.querier.query(abortSignal, userId);
    return JSON.stringify(processes);
  }
}
