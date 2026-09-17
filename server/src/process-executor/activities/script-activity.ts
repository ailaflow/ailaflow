import { ScriptStep } from '@ailaflow/shared';
import { createAtomActivity } from 'sequential-workflow-machine';
import { ProcessExecutionGlobalState } from '../process-execution-global-state';

export const scriptStepActivity = createAtomActivity<ScriptStep, ProcessExecutionGlobalState>('script', {
  init: () => ({}),
  handler: async (step: ScriptStep, { stopSignal, scriptExecutor }: ProcessExecutionGlobalState) => {
    await scriptExecutor.execute(stopSignal, step.id, step.properties.script);
  }
});
