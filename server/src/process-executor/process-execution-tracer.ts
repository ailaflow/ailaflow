import { Logger } from '../core/logger';
import { ProcessExecutionTrace } from '../repositories/process-execution-trace/process-execution-trace';
import { ProcessExecutionTraceEventRepository } from '../repositories/process-execution-trace/process-execution-trace-event-repository';
import { ProcessExecutionTraceRepository } from '../repositories/process-execution-trace/process-execution-trace-repository';
import { Process } from '../repositories/process/process';
import { ProcessExecution } from './process-execution';
import { ProcessExecutionTraceObserver } from './process-execution-trace-observer';

export class ProcessExecutionTracer {
  private readonly logger = new Logger(ProcessExecutionTracer.name);

  public constructor(
    private readonly traceRepository: ProcessExecutionTraceRepository,
    private readonly traceEventRepository: ProcessExecutionTraceEventRepository
  ) {}

  public bind(process: Process, execution: ProcessExecution) {
    const trace = ProcessExecutionTrace.createOrResume(
      execution.id,
      process.name,
      process.traceRetention,
      execution.isResumed,
      execution.context
    );

    const observer = new ProcessExecutionTraceObserver(trace, execution);
    observer.onTraceChanged.subscribe(async () => {
      try {
        const signal = AbortSignal.timeout(3_000);
        await this.traceRepository.upsert(signal, trace);
      } catch (e) {
        this.logger.warn(`Failed to upsert process execution trace: ${e}`);
      }
    });
    observer.onEventCreated.subscribe(async event => {
      try {
        const signal = AbortSignal.timeout(3_000);
        await this.traceEventRepository.insert(signal, event);
      } catch (e) {
        this.logger.warn(`Failed to insert process execution trace event: ${e}`);
      }
    });
    observer.subscribe();
    observer.init(execution.isResumed);

    execution.onOutcome.once(() => observer.unsubscribe());
  }
}
