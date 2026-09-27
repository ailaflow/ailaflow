import { ProcessExecutionOutcomeType, ProcessExecutionVariableValues, ScriptStep } from '@ailaflow/shared';
import { UserProcessProvider } from '../../process/user-process-provider';
import { SandboxRpcHandler } from '../../sandbox/sandbox-rpc-handler';
import { ProcessExecutionStore } from '../process-execution-store';
import * as z from 'zod/v4';

const requestSchema = z.object({
  processName: z.string(),
  startValues: z.record(z.string(), z.unknown())
});

export class ExecuteProcessRpcHandler implements SandboxRpcHandler {
  public readonly methodName = 'executeProcess';

  public constructor(
    private readonly executionStore: ProcessExecutionStore,
    private readonly userProcessProvider: UserProcessProvider
  ) {}

  public async handle(signal: AbortSignal, _: string, executionId: string, data: object): Promise<ProcessExecutionVariableValues> {
    const execution = this.executionStore.get(executionId);

    const request = requestSchema.parse(data);

    const currentStep = execution.getCurrentlyExecutingStep<ScriptStep>();
    if (!currentStep.properties.script.allowedProcessNames.includes(request.processName)) {
      throw new Error(`Process /${request.processName} cannot be executed by this script`);
    }

    const process = await this.userProcessProvider.tryGet(signal, execution.context.startedBy, request.processName);
    if (!process) {
      throw new Error(`Process /${request.processName} was not found, or the user does not have access to it`);
    }

    const error = process.variables.validateStartValues(request.startValues);
    if (error) {
      throw new Error(`Invalid start values for process /${request.processName}: ${error}`);
    }

    const subExecution = execution.initializeSubExecution(process, request.startValues);

    const outcome = await subExecution.runAndWaitForOutcome(signal);

    if (outcome === null) {
      subExecution.tryStop();
      signal.throwIfAborted();
      throw new Error(`Process /${request.processName} took too long to finish and was stopped`);
    }
    if (outcome.type === ProcessExecutionOutcomeType.FINISHED) {
      return outcome.output;
    }
    if (outcome.type === ProcessExecutionOutcomeType.FAILED) {
      throw new Error(`Process /${request.processName} failed: ${outcome.error}`);
    }
    if (outcome.type === ProcessExecutionOutcomeType.PAUSED) {
      throw new Error(`Process /${request.processName} paused before it finished`);
    }

    throw new Error(`Process /${request.processName} returned an unsupported execution outcome`);
  }
}
