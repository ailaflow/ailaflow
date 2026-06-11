import { ScriptStep } from '@aila/model';
import { createAtomActivity } from 'sequential-workflow-machine';
import { WorkflowMachineGlobalState } from '../workflow-machine-global-state';

export const scriptStepActivity = createAtomActivity<ScriptStep, WorkflowMachineGlobalState>('script', {
  init: () => ({}),
  handler: async (step: ScriptStep, { $scriptExecutor }: WorkflowMachineGlobalState) => {
    const abortSignal = AbortSignal.timeout(10_000);
    await $scriptExecutor.execute(abortSignal, step.id, step.properties.script);
  }
});
