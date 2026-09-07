import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import z from 'zod/v4';
import { ProcessExecutionStore } from '../../process-executor/process-execution-store';

const inputSchema = z.object({ name: z.string(), value: z.unknown() });

type Input = z.infer<typeof inputSchema>;

export class SetVariableTool extends ZodTool<Input> {
  public constructor(
    private readonly executionId: string,
    private readonly executionStore: ProcessExecutionStore
  ) {
    super(
      'setVariable',
      'Sets a process variable after schema validation. Writes take effect immediately and are not rolled back on failure. Calls in one batch run concurrently; perform dependent writes in separate turns.',
      inputSchema
    );
  }

  protected async handle(_signal: AbortSignal, _context: ToolContext, arg: Input): Promise<ZodToolExecutionResult> {
    const execution = this.executionStore.get(this.executionId);
    execution.writeVariable(arg.name, arg.value);
    return { content: { success: true } };
  }
}
