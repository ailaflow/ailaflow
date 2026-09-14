import { Repository } from '../repository';
import { Transaction } from '../../core/transaction';
import { AssignedTask } from './assigned-task';

export interface AssignedTaskRepository extends Repository {
  tryGet(abortSignal: AbortSignal, taskId: string, userName: string): Promise<AssignedTask | null>;
  upsert(abortSignal: AbortSignal, assignedTask: AssignedTask, transaction?: Transaction): Promise<void>;
  upsertMultiple(abortSignal: AbortSignal, assignedTasks: AssignedTask[], transaction?: Transaction): Promise<void>;
  getAllCompleted(abortSignal: AbortSignal, taskId: string): Promise<AssignedTask[]>;
}
