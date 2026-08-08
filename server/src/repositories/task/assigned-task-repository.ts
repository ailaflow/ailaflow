import { Repository } from '../repository';
import { AssignedTask } from './assigned-task';

export interface AssignedTaskRepository extends Repository {
  tryGet(abortSignal: AbortSignal, taskId: string, userName: string): Promise<AssignedTask | null>;
  upsert(abortSignal: AbortSignal, assignedTask: AssignedTask): Promise<void>;
  upsertMultiple(abortSignal: AbortSignal, assignedTasks: AssignedTask[]): Promise<void>;
  getAllCompleted(abortSignal: AbortSignal, taskId: string): Promise<AssignedTask[]>;
}
