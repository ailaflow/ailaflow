import { createInterruptionActivity } from 'sequential-workflow-machine';
import { ProcessExecutionGlobalState } from '../process-execution-global-state';
import { ReturnStep } from '@aila/model';

export const returnActivity = createInterruptionActivity<ReturnStep, ProcessExecutionGlobalState>('return', {
  handler: async (step: ReturnStep, globalState: ProcessExecutionGlobalState) => {
    globalState.result = {
      outputVariableNames: step.properties.outputVariableNames,
      stepId: step.id
    };
  }
});
