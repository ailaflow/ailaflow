import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import { JsonSchema, ProcessExecutionOutcomeType } from '@ailaflow/shared';
import { Process } from '../../repositories/process/process';
import z from 'zod/v4';
import { ProcessExecutionStore } from '../../process-executor/process-execution-store';

export class RunProcessTool extends ZodTool<Record<string, unknown>> {
  public constructor(
    private readonly executionId: string,
    private readonly process: Process,
    private readonly executionStore: ProcessExecutionStore
  ) {
    const schema: Record<string, JsonSchema> = {};
    const zod: Record<string, z.ZodType> = {};
    for (const name of process.definition.properties.startVariableNames) {
      schema[name] = process.variables.getSchema(name);
      zod[name] = process.variables.getZodSchema(name);
    }

    super(
      `run_process_${process.name}`,
      `Runs process "${process.name}" and waits for completion. ${process.description}\nPausable processes cannot run. Calls in one batch run concurrently; use separate turns for dependent calls.`,
      z.object(zod),
      schema
    );
  }

  protected async handle(signal: AbortSignal, _: ToolContext, input: Record<string, unknown>): Promise<ZodToolExecutionResult> {
    const execution = this.executionStore.get(this.executionId);
    if (this.process.isPausable) {
      throw new Error(`Process "${this.process.name}" is pausable and cannot be run by an agent`);
    }

    const error = this.process.variables.validateStartValues(input);
    if (error) {
      throw new Error(error);
    }

    const softSignal = AbortSignal.any([signal, AbortSignal.timeout(60_000)]);

    const subExecution = execution.initializeSubExecution(this.process, input);

    const outcome = await subExecution.runAndWaitForOutcome(softSignal);

    if (outcome === null) {
      subExecution.tryStop();
      signal.throwIfAborted();
      return { content: { error: 'The process execution took too long and was stopped' } };
    }
    if (outcome.type === ProcessExecutionOutcomeType.FINISHED) {
      return { content: { outputValues: outcome.output } };
    }
    if (outcome.type === ProcessExecutionOutcomeType.FAILED) {
      return { content: { error: outcome.error } };
    }

    // Pausable processes should not reach this point.
    throw new Error('Invalid execution outcome');
  }
}
