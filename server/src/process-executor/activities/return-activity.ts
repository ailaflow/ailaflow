import { createInterruptionActivity } from 'sequential-workflow-machine';
import { WorkflowMachineGlobalState } from '../workflow-machine-global-state';
import { ReturnStep } from '@aila/model';
import { InterruptedError, InterruptedErrorCode } from '../errors/interrupted-error';

export const returnActivity = createInterruptionActivity<ReturnStep, WorkflowMachineGlobalState>('return', {
  handler: async (step: ReturnStep, globalState: WorkflowMachineGlobalState) => {
    globalState.outputVariableNames = step.properties.outputVariableNames;
    globalState.interruptedError = new InterruptedError(InterruptedErrorCode.RETURN, 'Returned variable values');
  }
});
