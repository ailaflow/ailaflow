import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import z from 'zod/v4';
import { LazyProcessExecutor } from '../../process-executor/lazy-process-executor';
import { ProcessExecutionContext } from '../../process-executor/process-execution-context';
import { ProcessManager } from '../../process/process-manager';
import { ChatSessionId } from '../chat-session-id';

const FAST_TIMEOUT = 6_000;

const inputSchema = z.object({
  name: z.string(),
  input: z.record(z.string(), z.unknown())
});

type Arg = z.infer<typeof inputSchema>;

export class TestProcessTool extends ZodTool<Arg> {
  public constructor(
    private readonly processManager: ProcessManager,
    private readonly lazyProcessExecutor: LazyProcessExecutor
  ) {
    super('global_test_process', 'Tests a process', inputSchema);
  }

  public async handle(abortSignal: AbortSignal, { sessionId }: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    const { userName } = ChatSessionId.decode(sessionId);
    const process = await this.processManager.tryGetByName(abortSignal, arg.name);
    if (!process) {
      return {
        content: {
          error: `Cannot find the "${arg.name}" process`
        }
      };
    }

    const inputError = process.variables.validateStartValues(arg.input);
    if (inputError) {
      return {
        content: {
          error: inputError
        }
      };
    }

    const context: ProcessExecutionContext = {
      startedBy: userName,
      chatSessionId: sessionId,
      isTest: true
    };

    const abortController = new AbortController();
    const result = await this.lazyProcessExecutor.execute(abortController.signal, FAST_TIMEOUT, context, process, arg.input);

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

    let m = `Process "${arg.name}" started successfully. Execution ID: "${result.executionId}"\n`;
    m += `The process is still running, so this tool is returning before it finishes. Execution will continue in the background.\n`;
    m += `The system will notify you when the process finishes.`;

    return {
      content: {
        success: m
      }
    };
  }
}
