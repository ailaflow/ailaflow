import { TaskStep } from '@aila/model';
import { createSignalActivity } from 'sequential-workflow-machine';
import { ProcessExecutionGlobalState } from '../process-execution-global-state';

export const taskStepActivity = createSignalActivity<TaskStep, ProcessExecutionGlobalState>('task', {
  init: () => ({}),
  beforeSignal: async (step: TaskStep, globalState: ProcessExecutionGlobalState) => {
    const abortSignal = AbortSignal.timeout(5_000);
    await globalState.$taskManager.create(abortSignal, globalState.executionId, step);
  },
  afterSignal: async () => {
    throw new Error('Not implemented');
  }
});
