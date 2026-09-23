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
  tryGet(signal: AbortSignal, id: string): Promise<Task | null>;
  insert(signal: AbortSignal, task: Task, transaction?: Transaction): Promise<void>;
  delete(signal: AbortSignal, id: string, transaction?: Transaction): Promise<boolean>;
  finalize(signal: AbortSignal, id: string, time: number, transaction?: Transaction): Promise<void>;
  fail(signal: AbortSignal, id: string, time: number, transaction?: Transaction): Promise<void>;
  incrementFinalizationRequestCount(signal: AbortSignal, id: string, delta: number, transaction?: Transaction): Promise<void>;
  setNextFinalizationAttemptAt(signal: AbortSignal, id: string, time: number, transaction?: Transaction): Promise<void>;
}
