import { ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import { SandboxListQuerier } from '../../queriers/sandbox-list/sandbox-list-querier';
import { SandboxTerminalAccess } from '@ailaflow/shared';

export class GetSandboxesTool extends ZodTool<void> {
  public constructor(private readonly querier: SandboxListQuerier) {
    super('global_get_sandboxes', 'Get all available sandboxes in the system');
  }

  public async handle(signal: AbortSignal): Promise<ZodToolExecutionResult> {
    const list = await this.querier.query(signal);
    return {
      content: list
        .filter(s => s.isEnabled)
        .map(sandbox => ({
          name: sandbox.name,
          description: sandbox.description,
          canAccessTerminalWithAiTool: sandbox.terminalAccess === SandboxTerminalAccess.PORTAL_AND_ADMIN_ASSISTANT
        }))
    };
  }
}
