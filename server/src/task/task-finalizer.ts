import { TaskCompletionMetadata } from '@ailaflow/shared';
import { ProcessExecutionResumer } from '../process-executor/process-execution-resumer';
import { IncompleteAssignedTaskCountQuerier } from '../queriers/task/incomplete-assigned-task-count-querier';
import { AssignedTaskRepository } from '../repositories/task/assigned-task-repository';
import { TaskRepository } from '../repositories/task/task-repository';

export class TaskFinalizer {
  public constructor(
    private readonly assignedTaskRepository: AssignedTaskRepository,
    private readonly taskRepository: TaskRepository,
    private readonly incompleteAssignedTaskCountQuerier: IncompleteAssignedTaskCountQuerier,
    private readonly processExecutionResumer: ProcessExecutionResumer
  ) {}

  public async tryFinalize(abortSignal: AbortSignal, taskId: string, deadlineExceeded: boolean): Promise<boolean> {
    const task = await this.taskRepository.tryGet(abortSignal, taskId);
    if (!task || task.finalizedAt !== null) {
      return false;
    }

    if (!deadlineExceeded && task.finalizationPolicy === 'all_assignees') {
      const incompleteCount = await this.incompleteAssignedTaskCountQuerier.queryIncompleteAssignedTaskCount(abortSignal, task.id);
      if (incompleteCount > 0) {
        return false;
      }
    }

    const completedAssignedTasks = await this.assignedTaskRepository.getAllCompleted(abortSignal, task.id);

    if (!deadlineExceeded && task.finalizationPolicy === 'any_assignee' && completedAssignedTasks.length === 0) {
      return false;
    }

    const variableValues: Record<string, unknown[]> = {};
    const metaItems: TaskCompletionMetadata['items'] = [];

    const outputVariableNames = task.outputVariableSchemas ? Object.keys(task.outputVariableSchemas) : null;
    if (outputVariableNames) {
      for (const name of outputVariableNames) {
        variableValues[name] = [];
      }
    }

    for (const assignedTask of completedAssignedTasks) {
      if (!assignedTask.outputValues || assignedTask.completedAt === null) {
        throw new Error('Assigned task has invalid state');
      }

      if (outputVariableNames) {
        for (const name of outputVariableNames) {
          const items = assignedTask.outputValues[name];
          if (items === undefined) {
            throw new Error(`Assigned task is missing output variable: \$${name}`);
          }
          if (!Array.isArray(items)) {
            throw new Error(`Assigned task output variable is not an array: \$${name}`);
          }
          if (items.length !== 1) {
            throw new Error(`Assigned task output variable has more than one item: \$${name}`);
          }
          variableValues[name].push(items[0]);
        }
      }

      metaItems.push({
        time: assignedTask.completedAt,
        userName: assignedTask.userName
      });
    }

    const value: Record<string, unknown> = variableValues;
    if (task.metadataVariableName) {
      value[task.metadataVariableName] = {
        status: deadlineExceeded ? 'deadline_occurred' : 'completed',
        items: metaItems
      };
    }

    const executionSignal = new AbortController().signal;
    await this.processExecutionResumer.resume(executionSignal, task.executionId, value);

    await this.taskRepository.finalize(abortSignal, task.id, Date.now());

    return true;
  }
}
