import { createInterruptionActivity } from 'sequential-workflow-machine';
import { WorkflowMachineGlobalState } from '../workflow-machine-global-state';
import { ReturnStep } from '@aila/model';

export const returnActivity = createInterruptionActivity<ReturnStep, WorkflowMachineGlobalState>('return', {
  handler: async (step: ReturnStep, globalState: WorkflowMachineGlobalState) => {
    globalState.result = {
      outputVariableNames: step.properties.outputVariableNames,
      stepId: step.id
    };
  }
});
