import { ScriptStep } from '@aila/model';
import { createAtomActivity } from 'sequential-workflow-machine';
import { WorkflowMachineGlobalState } from '../workflow-machine-global-state';

export const scriptStepActivity = createAtomActivity<ScriptStep, WorkflowMachineGlobalState>('script', {
  init: () => ({}),
  handler: async (step: ScriptStep, { $logger }: WorkflowMachineGlobalState) => {
    $logger.info('Test! ' + step.name);
  }
});
