import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import { MyProcessAccessQuerier } from '../../queriers/my-process/my-process-access-querier';
import { ProcessRepository } from '../../repositories/process-repository/process-repository';
import z from 'zod/v4';
import { ChatSessionId } from '../chat-session-id';

const inputSchema = z.object({
  name: z.string()
});

type Arg = z.infer<typeof inputSchema>;

export class OpenMyProcessStartFormTool extends ZodTool<Arg> {
  public constructor(
    private readonly accessQuerier: MyProcessAccessQuerier,
    private readonly processRepository: ProcessRepository
  ) {
    super('open_start_form_of_my_process', 'Opens a start for given process', inputSchema);
  }

  protected async handle(abortSignal: AbortSignal, { sessionId }: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    const { userName } = ChatSessionId.decode(sessionId);

    const hasAccess = await this.accessQuerier.hasAccess(abortSignal, userName, arg.name);
    if (!hasAccess) {
      return {
        content: {
          error: `Cannot find the "${arg.name}" process, or you do not have access to it`
        }
      };
    }

    const process = await this.processRepository.tryGetByName(abortSignal, arg.name);
    if (!process) {
      throw new Error(`Cannot find the "${arg.name}" process, even though access was granted`);
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
