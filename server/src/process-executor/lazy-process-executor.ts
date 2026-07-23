import { ProcessExecutionResult, ProcessExecutionVariableValues } from '@aila/model';
import { Process } from '../repositories/process-repository/process';
import { ProcessExecutor } from './process-executor';
import { EventBus } from '../events/event-bus';
import { LazyProcessFinishedEvent } from '../events/handlers/lazy-process-finished-event';

export type LazyProcessExecutorResult =
  | {
      finished: true;
      result: ProcessExecutionResult;
    }
  | {
      finished: false;
      executionId: string;
    };

export class LazyProcessExecutor {
  public constructor(
    private readonly processExecutor: ProcessExecutor,
    private readonly eventBus: EventBus
  ) {}

  public execute(
    abortSignal: AbortSignal,
    fastTimeout: number,
    userName: string,
    process: Process,
    input: ProcessExecutionVariableValues
  ): Promise<LazyProcessExecutorResult> {
    const execution = this.processExecutor.initialize(process, input);

    return new Promise(resolve => {
      let released = false;
      const to = setTimeout(() => {
        if (!released) {
          released = true;
          resolve({
            finished: false,
            executionId: execution.id
          });
        }
      }, fastTimeout);

      execution.onFinished.subscribe(result => {
        if (released) {
          clearTimeout(to);
          const event = new LazyProcessFinishedEvent(userName, execution.id, process.name, result);
          this.eventBus.publish(event);
          return;
        }
        resolve({
          finished: true,
          result
        });
      });
      execution.run(abortSignal);
    });
  }
}
