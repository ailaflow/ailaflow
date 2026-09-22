import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import z from 'zod/v4';
import { UserProcessProvider } from '../../process/user-process-provider';
import { ChatSessionId } from '../chat-session-id';

const inputSchema = z.object({
  processName: z.string()
});

type Arg = z.infer<typeof inputSchema>;

export class GetMyProcessDetailsTool extends ZodTool<Arg> {
  public constructor(private readonly userProcessProvider: UserProcessProvider) {
    super(
      'get_my_process_details',
      'Returns process details. startVariableSchemas maps each required top-level key of startVariableValues in start_my_process to the JSON Schema for that value.',
      inputSchema
    );
  }

  public async handle(signal: AbortSignal, { sessionId }: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    const { userName } = ChatSessionId.decode(sessionId);
    const process = await this.userProcessProvider.tryGet(signal, userName, arg.processName);
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
        startVariableSchemas: process.startVariableSchemas
      }
    };
  }
}
