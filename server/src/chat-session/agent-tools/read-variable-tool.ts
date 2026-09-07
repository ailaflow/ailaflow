import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import z from 'zod/v4';
import { ProcessExecutionStore } from '../../process-executor/process-execution-store';

const inputSchema = z.object({ name: z.string() });

export class ReadVariableTool extends ZodTool<z.infer<typeof inputSchema>> {
  public constructor(
    private readonly executionId: string,
    private readonly executionStore: ProcessExecutionStore
  ) {
    super(
      'readVariable',
      'Reads a process variable. Calls in one batch run concurrently; read after a write in a separate turn.',
      inputSchema
    );
  }

  protected async handle(_signal: AbortSignal, _context: ToolContext, arg: z.infer<typeof inputSchema>): Promise<ZodToolExecutionResult> {
    const execution = this.executionStore.get(this.executionId);
    return { content: { value: execution.readVariable(arg.name) } };
  }
}
