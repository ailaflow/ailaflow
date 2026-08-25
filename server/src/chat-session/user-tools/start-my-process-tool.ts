import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import { LazyProcessExecutor } from '../../process-executor/lazy-process-executor';
import z from 'zod/v4';
import { ChatSessionId } from '../chat-session-id';
import { UserProcessProvider } from '../../process/user-process-provider';
import { ProcessExecutionContext } from '../../process-executor/process-execution-context';

const FAST_TIMEOUT = 3_000;

const inputSchema = z.object({
  name: z.string(),
  startValues: z.record(z.string(), z.unknown())
});

type Arg = z.infer<typeof inputSchema>;

export class StartMyProcessTool extends ZodTool<Arg> {
  public constructor(
    private readonly userProcessProvider: UserProcessProvider,
    private readonly lazyProcessExecutor: LazyProcessExecutor
  ) {
    super('start_my_process', 'Starts a new process', inputSchema);
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

    const startValuesError = process.variables.validateStartValues(arg.startValues);
    if (startValuesError) {
      return {
        content: {
          error: startValuesError
        }
      };
    }

    const context: ProcessExecutionContext = {
      startedBy: userName,
      chatSessionId: sessionId,
      isTest: false
    };

    const abortController = new AbortController();
    const result = await this.lazyProcessExecutor.execute(abortController.signal, FAST_TIMEOUT, context, process, arg.startValues);

    if (result.finished) {
      return {
        content: result.result.success
          ? {
              outputValues: result.result.output
            }
          : {
              error: result.result.error
            }
      };
    }
    return {
      content: {
        success: `Process "${arg.name}" started successfully. It is running in the background, and you will be notified when it finishes, execution id: ${result.executionId}`
      }
    };
  }
}
