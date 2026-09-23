import { Repository } from '../repository';
import { Transaction } from '../../core/transaction';
import { AssignedTask } from './assigned-task';

export interface AssignedTaskRepository extends Repository {
  tryGet(signal: AbortSignal, taskId: string, userName: string): Promise<AssignedTask | null>;
  upsert(signal: AbortSignal, assignedTask: AssignedTask, transaction?: Transaction): Promise<void>;
  upsertMultiple(signal: AbortSignal, assignedTasks: AssignedTask[], transaction?: Transaction): Promise<void>;
  getAllCompleted(signal: AbortSignal, taskId: string): Promise<AssignedTask[]>;
  deleteAll(signal: AbortSignal, taskId: string, transaction?: Transaction): Promise<void>;
}
