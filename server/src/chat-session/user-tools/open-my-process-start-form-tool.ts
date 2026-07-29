import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import z from 'zod/v4';
import { ChatSessionId } from '../chat-session-id';
import { UserProcessProvider } from '../../providers/user-process-provider';

const inputSchema = z.object({
  name: z.string()
});

type Arg = z.infer<typeof inputSchema>;

export class OpenMyProcessStartFormTool extends ZodTool<Arg> {
  public constructor(private readonly userProcessProvider: UserProcessProvider) {
    super('open_start_form_of_my_process', 'Opens a start for given process', inputSchema);
  }

  protected async handle(abortSignal: AbortSignal, { sessionId }: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    const { userName } = ChatSessionId.decode(sessionId);

    const process = await this.userProcessProvider.tryGet(abortSignal, userName, arg.name);
    if (!process) {
      return {
        content: {
          error: `Cannot find the "${arg.name}" process, or you do not have access to it`
        }
      };
    }

    return {
      content: {
        success: `The start form of the "${arg.name}" process is displayed after this message. This form is visible only by the user.`
      },
      metadata: {
        startForm: {
          processName: process.name
        }
      }
    };
  }
}
