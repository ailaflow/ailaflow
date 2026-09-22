import { ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import { SandboxListQuerier } from '../../queriers/sandbox-list/sandbox-list-querier';

export class GetSandboxesTool extends ZodTool<void> {
  public constructor(private readonly querier: SandboxListQuerier) {
    super('global_get_sandboxes', 'Get all available sandboxes in the system');
  }

  public async handle(signal: AbortSignal): Promise<ZodToolExecutionResult> {
    return {
      content: await this.querier.query(signal)
    };
  }
}
