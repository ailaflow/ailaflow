import { TaskStep } from '@aila/model';
import { createSignalActivity } from 'sequential-workflow-machine';
import { WorkflowMachineGlobalState } from '../workflow-machine-global-state';

export const taskStepActivity = createSignalActivity<TaskStep, WorkflowMachineGlobalState>('task', {
  init: () => ({}),
  beforeSignal: async (step: TaskStep, globalState: WorkflowMachineGlobalState) => {
    const abortSignal = AbortSignal.timeout(5_000);
    await globalState.$taskManager.create(abortSignal, globalState.executionId, step);
  },
  afterSignal: async () => {
    throw new Error('Not implemented');
  }
});
