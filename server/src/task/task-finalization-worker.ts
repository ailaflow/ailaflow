import { Logger } from '../core/logger';
import { TaskFinalizationCandidate, TaskFinalizationCandidateQuerier } from '../queriers/task/task-finalization-candidate-querier';
import { TaskRepository } from '../repositories/task/task-repository';
import { TaskFinalizer } from './task-finalizer';

export class TaskFinalizationWorker {
  private readonly logger = new Logger(TaskFinalizationWorker.name);
  private readonly abortController = new AbortController();
  private iv: ReturnType<typeof setInterval> | null = null;
  private isWorking = false;

  public constructor(
    private readonly candidateQuerier: TaskFinalizationCandidateQuerier,
    private readonly finalizer: TaskFinalizer,
    private readonly taskRepository: TaskRepository
  ) {}

  public start() {
    if (this.iv) {
      throw new Error('Worker is already started');
    }
    this.iv = setInterval(this.trigger, 30_000);
    this.trigger();
  }

  public readonly trigger = () => {
    if (this.isWorking) {
      return;
    }
    this.isWorking = true;
    void (async () => {
      try {
        await this.iterate();
      } catch (e) {
        this.logger.error(`Error occurred during task finalization iteration: ${e}`);
      } finally {
        this.isWorking = false;
      }
    })();
  };

  public stop() {
    if (this.iv) {
      clearInterval(this.iv);
      this.iv = null;
    }
    this.abortController.abort();
  }

  private async iterate() {
    while (!this.abortController.signal.aborted) {
      const now = Date.now();

      const candidatesSignal = AbortSignal.any([this.abortController.signal, AbortSignal.timeout(4_000)]);
      const candidates = await this.candidateQuerier.query(candidatesSignal, now, 8);
      if (candidates.length === 0) {
        break;
      }

      for (const candidate of candidates) {
        await this.iterateCandidate(now, candidate);
      }
    }
  }

  private async iterateCandidate(now: number, candidate: TaskFinalizationCandidate) {
    const candidateSignal = AbortSignal.any([this.abortController.signal, AbortSignal.timeout(10_000)]);
    const deadlineExceeded = candidate.deadline !== null && candidate.deadline < now;

    try {
      const success = await this.finalizer.tryFinalize(candidateSignal, candidate.id, deadlineExceeded);
      if (!success) {
        await this.taskRepository.incrementFinalizationRequestCount(candidateSignal, candidate.id, -candidate.finalizationRequestCount);
      }
    } catch (e) {
      this.logger.warn(`Failed to finalize task ${candidate.id}: ${e}`);

      const nextAttemptAt = Date.now() + 2 * 60 * 1000;
      await this.taskRepository.setNextFinalizationAttemptAt(candidateSignal, candidate.id, nextAttemptAt);
    }
  }
}
