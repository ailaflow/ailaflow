import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import z from 'zod/v4';
import { ProcessVariableManager } from '../../process-executor/services/process-variable-manager';

const inputSchema = z.object({ name: z.string(), value: z.unknown() });

export class SetVariableTool extends ZodTool<z.infer<typeof inputSchema>> {
  public constructor(private readonly variables: ProcessVariableManager) {
    super(
      'setVariable',
      'Sets a process variable after schema validation. Writes take effect immediately and are not rolled back on failure. Calls in one batch run concurrently; perform dependent writes in separate turns.',
      inputSchema
    );
  }

  protected async handle(_signal: AbortSignal, _context: ToolContext, arg: z.infer<typeof inputSchema>): Promise<ZodToolExecutionResult> {
    this.variables.set(arg.name, arg.value);
    return { content: { success: true } };
  }
}
