import { Repository } from '../repository';
import { Task } from './task';

export class TaskRepositoryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = TaskRepositoryError.name;
  }
}

export interface TaskRepository extends Repository {
  tryGet(abortSignal: AbortSignal, id: string): Promise<Task | null>;
  insert(abortSignal: AbortSignal, task: Task): Promise<void>;
}
