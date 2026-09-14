import { Repository } from '../repository';
import { Transaction } from '../../core/transaction';
import { Task } from './task';

export class TaskRepositoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = TaskRepositoryError.name;
  }
}

export interface TaskRepository extends Repository {
  tryGet(abortSignal: AbortSignal, id: string): Promise<Task | null>;
  insert(abortSignal: AbortSignal, task: Task, transaction?: Transaction): Promise<void>;
  delete(abortSignal: AbortSignal, id: string, transaction?: Transaction): Promise<boolean>;
  finalize(abortSignal: AbortSignal, id: string, time: number, transaction?: Transaction): Promise<void>;
  incrementFinalizationRequestCount(abortSignal: AbortSignal, id: string, delta: number, transaction?: Transaction): Promise<void>;
  setNextFinalizationAttemptAt(abortSignal: AbortSignal, id: string, time: number, transaction?: Transaction): Promise<void>;
}
