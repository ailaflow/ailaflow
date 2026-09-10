import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import { JsonSchema, ProcessExecutionResult } from '@ailaflow/model';
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

  protected async handle(abortSignal: AbortSignal, _: ToolContext, input: Record<string, unknown>): Promise<ZodToolExecutionResult> {
    const execution = this.executionStore.get(this.executionId);
    if (this.process.isPausable) {
      throw new Error(`Process "${this.process.name}" is pausable and cannot be run by an agent`);
    }

    const error = this.process.variables.validateStartValues(input);
    if (error) {
      throw new Error(error);
    }

    const signal = AbortSignal.any([abortSignal, AbortSignal.timeout(60_000)]);

    const subExecution = execution.initializeSubExecution(this.process, input);

    const result = await new Promise<ProcessExecutionResult>(resolve => {
      const onFinished = (result: ProcessExecutionResult) => {
        subExecution.onFinished.unsubscribe(onFinished);
        resolve(result);
      };
      subExecution.onFinished.subscribe(onFinished);
      subExecution.run(signal);
    });

    return { content: result.success ? { outputValues: result.output } : { error: result.error } };
  }
}
