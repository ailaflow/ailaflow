import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import * as z from 'zod/v4';
import { ProcessManager } from '../../process/process-manager';
import { ProcessExecutionMode } from '@ailaflow/shared';

const inputSchema = z.object({
  processName: z.string()
});

type Arg = z.infer<typeof inputSchema>;

export class GetProcessDetailsTool extends ZodTool<Arg> {
  public constructor(private readonly processManager: ProcessManager) {
    super('global_get_process_details', 'Returns the name, description, and start variable schemas for a process', inputSchema);
  }

  public async handle(signal: AbortSignal, _: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    const process = await this.processManager.tryGetByName(signal, arg.processName);
    if (!process) {
      return {
        content: {
          error: 'Process not found'
        }
      };
    }

    return {
      content: {
        name: process.name,
        description: process.description,
        startVariableSchemas: process.startVariableSchemas,
        canStartWithAiTool: process.executionMode === ProcessExecutionMode.AI_TOOL_OR_START_FORM
      }
    };
  }
}
