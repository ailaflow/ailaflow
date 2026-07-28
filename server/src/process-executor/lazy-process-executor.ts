import { ProcessExecutionResult, ProcessExecutionVariableValues } from '@aila/model';
import { Process } from '../repositories/process/process';
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
    fastTimeout: number | null,
    userName: string,
    process: Process,
    input: ProcessExecutionVariableValues
  ): Promise<LazyProcessExecutorResult> {
    const execution = this.processExecutor.initialize(process, input);

    return new Promise(resolve => {
      let released = false;
      let to: ReturnType<typeof setTimeout> | null = null;

      const onFinished = (result: ProcessExecutionResult) => {
        if (released) {
          if (to) {
            clearTimeout(to);
            to = null;
          }
          const event = new LazyProcessFinishedEvent(userName, execution.id, process.name, result);
          this.eventBus.publish(event);
          released = true;
          return;
        }
        resolve({
          finished: true,
          result
        });
      };

      const resolveUnfinished = () => {
        execution.onFinished.unsubscribe(onFinished);
        resolve({
          finished: false,
          executionId: execution.id
        });
      };

      execution.onFinished.subscribe(onFinished);

      if (fastTimeout === null) {
        released = true;
        setTimeout(resolveUnfinished);
      } else {
        to = setTimeout(() => {
          if (!released) {
            released = true;
            resolveUnfinished();
          }
        }, fastTimeout);
      }

      execution.run(abortSignal);
    });
  }
}
