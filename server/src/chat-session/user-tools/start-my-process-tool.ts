import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import { ProcessExecutionVariableValues } from '@aila/model';
import { LazyProcessExecutor } from '../../process-executor/lazy-process-executor';
import z from 'zod/v4';
import { ChatSessionId } from '../chat-session-id';
import { MyProcessProvider } from '../../my-process/my-process-provider';

const FAST_TIMEOUT = 3_000;

const inputSchema = z.object({
  name: z.string(),
  startValues: z.record(z.string(), z.unknown())
});

type Arg = z.infer<typeof inputSchema>;

export class StartMyProcessTool extends ZodTool<Arg> {
  public constructor(
    private readonly myProcessProvider: MyProcessProvider,
    private readonly lazyProcessExecutor: LazyProcessExecutor
  ) {
    super('start_my_process', 'Starts a new process', inputSchema);
  }

  protected async handle(abortSignal: AbortSignal, { sessionId }: ToolContext, arg: Arg): Promise<ZodToolExecutionResult> {
    const { userName } = ChatSessionId.decode(sessionId);

    const process = await this.myProcessProvider.tryGet(abortSignal, userName, arg.name);
    if (!process) {
      return {
        content: {
          error: `Cannot find the "${arg.name}" process, or you do not have access to it`
        }
      };
    }

    const input: ProcessExecutionVariableValues = {};

    if (process.startVariableSchemas) {
      const validatorMap = process.getVariableValidatorMap();
      for (const name of Object.keys(process.startVariableSchemas)) {
        const validator = validatorMap.get(name);
        if (!validator) {
          throw new Error('Cannot find validator');
        }
        const startValue = arg.startValues[name];
        const { error, data } = validator.safeParse(startValue);
        if (error) {
          return {
            content: {
              error: `Variable value \$${name} does not meet the required schema: ${error}`
            }
          };
        }
        input[name] = data;
      }
    }

    const abortController = new AbortController();
    const result = await this.lazyProcessExecutor.execute(abortController.signal, FAST_TIMEOUT, userName, process, input);

    if (result.finished) {
      return {
        content: result.result.success
          ? result.result.output
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
