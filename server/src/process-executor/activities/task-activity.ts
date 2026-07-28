import { TaskStep } from '@aila/model';
import { createSignalActivity } from 'sequential-workflow-machine';
import { WorkflowMachineGlobalState } from '../workflow-machine-global-state';

export const taskStepActivity = createSignalActivity<TaskStep, WorkflowMachineGlobalState>('task', {
  init: () => ({}),
  beforeSignal: async () => {
    throw new Error('Not implemented');
  },
  afterSignal: async () => {
    throw new Error('Not implemented');
  }
});
