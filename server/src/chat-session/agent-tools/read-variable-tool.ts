import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import z from 'zod/v4';
import { ProcessVariableManager } from '../../process-executor/services/process-variable-manager';

const inputSchema = z.object({ name: z.string() });

export class ReadVariableTool extends ZodTool<z.infer<typeof inputSchema>> {
  public constructor(private readonly variables: ProcessVariableManager) {
    super(
      'readVariable',
      'Reads a process variable. Calls in one batch run concurrently; read after a write in a separate turn.',
      inputSchema
    );
  }

  protected async handle(_signal: AbortSignal, _context: ToolContext, arg: z.infer<typeof inputSchema>): Promise<ZodToolExecutionResult> {
    return { content: { value: this.variables.get(arg.name) } };
  }
}
