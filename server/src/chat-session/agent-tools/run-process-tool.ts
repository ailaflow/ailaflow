import { ToolContext, ZodTool, ZodToolExecutionResult } from '@aibindkit/llm';
import { JsonSchema, ProcessExecutionResult } from '@aila/model';
import { Process } from '../../repositories/process/process';
import { ProcessExecutionContext } from '../../process-executor/process-execution-context';
import { ProcessExecutor } from '../../process-executor/process-executor';
import z from 'zod/v4';

export class RunProcessTool extends ZodTool<Record<string, unknown>> {
  public constructor(
    private readonly process: Process,
    private readonly currentProcessName: string,
    private readonly executionContext: ProcessExecutionContext,
    private readonly executor: ProcessExecutor
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
    const parentProcessNames = [...(this.executionContext.parentProcessNames ?? []), this.currentProcessName];
    if (this.process.isPausable) {
      throw new Error(`Process "${this.process.name}" is pausable and cannot be run by an agent`);
    }

    const error = this.process.variables.validateStartValues(input);
    if (error) {
      throw new Error(error);
    }

    const signal = AbortSignal.any([abortSignal, AbortSignal.timeout(60_000)]);

    const execution = this.executor.initialize(
      {
        startedBy: this.executionContext.startedBy,
        isTest: this.executionContext.isTest,
        parentProcessNames
      },
      this.process,
      input
    );

    const result = await new Promise<ProcessExecutionResult>(resolve => {
      const onFinished = (result: ProcessExecutionResult) => {
        execution.onFinished.unsubscribe(onFinished);
        resolve(result);
      };
      execution.onFinished.subscribe(onFinished);
      execution.run(signal);
    });

    return { content: result.success ? { outputValues: result.output } : { error: result.error } };
  }
}
