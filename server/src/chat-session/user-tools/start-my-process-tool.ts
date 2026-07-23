import { ToolContext, ZodTool } from '@aibindkit/llm';
import { MyProcessAccessQuerier } from '../../queriers/my-process/my-process-access-querier';
import { ProcessRepository } from '../../repositories/process-repository/process-repository';
import { ProcessExecutionVariableValues } from '@aila/model';
import { LazyProcessExecutor } from '../../process-executor/lazy-process-executor';
import z from 'zod/v4';

const FAST_TIMEOUT = 3_000;

const inputSchema = z.object({
  name: z.string(),
  startValues: z.record(z.string(), z.unknown())
});

type Arg = z.infer<typeof inputSchema>;

export class StartMyProcessTool extends ZodTool<Arg> {
  public constructor(
    private readonly accessQuerier: MyProcessAccessQuerier,
    private readonly processRepository: ProcessRepository,
    private readonly lazyProcessExecutor: LazyProcessExecutor
  ) {
    super('start_my_process', 'Starts a new process', inputSchema);
  }

  protected async handle(abortSignal: AbortSignal, { sessionId }: ToolContext, arg: Arg) {
    const userName = sessionId.split(':')[0];

    const hasAccess = await this.accessQuerier.hasAccess(abortSignal, userName, arg.name);
    if (!hasAccess) {
      return {
        error: `Cannot find the "${arg.name}" process, or you do not have access to it`
      };
    }

    const process = await this.processRepository.tryGetByName(abortSignal, arg.name);
    if (!process) {
      return {
        error: `Cannot find the "${arg.name}" process`
      };
    }

    const input: ProcessExecutionVariableValues = {};

    if (process.startVariablesSchemas) {
      const validatorMap = process.getVariableValidatorMap();
      for (const name of Object.keys(process.startVariablesSchemas)) {
        const validator = validatorMap.get(name);
        if (!validator) {
          throw new Error('Cannot find validator');
        }
        const startValue = arg.startValues[name];
        const { error, data } = validator.safeParse(startValue);
        if (error) {
          return {
            error: `Variable value \$${name} does not meet the required schema: ${error}`
          };
        }
        input[name] = data;
      }
    }

    const abortController = new AbortController();
    const result = await this.lazyProcessExecutor.execute(abortController.signal, FAST_TIMEOUT, userName, process, input);

    if (result.finished) {
      return result.result.success
        ? result.result.output
        : {
            error: result.result.error
          };
    }
    return {
      success: `Process "${arg.name}" started successfully. It is running in the background, and you will be notified when it finishes, execution id: ${result.executionId}`
    };
  }
}
