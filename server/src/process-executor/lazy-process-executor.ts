import { ProcessExecutionResult, ProcessExecutionVariableValues } from '@aila/model';
import { Process } from '../repositories/process/process';
import { ProcessExecutor } from './process-executor';
import { EventBus } from '../events/event-bus';
import { ProcessExecutionFinishedEvent } from '../events/process-execution/process-execution-finished-event';
import { ProcessExecutionOrigin } from './process-execution';

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
    origin: ProcessExecutionOrigin,
    process: Process,
    input: ProcessExecutionVariableValues
  ): Promise<LazyProcessExecutorResult> {
    const execution = this.processExecutor.initialize(origin, process, input);

    return new Promise(resolve => {
      let isWaiting = true;
      let to: ReturnType<typeof setTimeout> | null = null;

      const unbind = () => {
        execution.onPaused.unsubscribe(onPaused);
        execution.onFinished.unsubscribe(onFinished);
      };

      const onPaused = () => {
        unbind();
        if (isWaiting) {
          resolve({
            finished: false,
            executionId: execution.id
          });
        }
      };

      const onFinished = (result: ProcessExecutionResult) => {
        unbind();

        if (isWaiting) {
          if (to) {
            clearTimeout(to);
            to = null;
          }
          resolve({
            finished: true,
            result
          });
          return;
        }

        const event = new ProcessExecutionFinishedEvent(execution.id, origin, process.name, result);
        this.eventBus.publish(event);
      };

      const resolveUnfinished = () => {
        isWaiting = false;
        resolve({
          finished: false,
          executionId: execution.id
        });
      };

      execution.onPaused.subscribe(onPaused);
      execution.onFinished.subscribe(onFinished);

      if (fastTimeout === null) {
        resolveUnfinished();
      } else {
        to = setTimeout(() => {
          to = null;
          if (isWaiting) {
            resolveUnfinished();
          }
        }, fastTimeout);
      }

      execution.run(abortSignal);
    });
  }
}
