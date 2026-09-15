import { BranchStep } from '@ailaflow/shared';
import { branchName, createForkActivity } from 'sequential-workflow-machine';
import { ProcessExecutionGlobalState } from '../process-execution-global-state';

export const branchActivity = createForkActivity<BranchStep, ProcessExecutionGlobalState>('branch', {
  init: () => ({}),
  handler: async (step, { variables }) => {
    const selectorVariableName = step.properties.branchSelectorVariableName;
    const targetBranchName = variables.get<string>(selectorVariableName);
    if (!targetBranchName) {
      throw new Error(`Branch selector variable \$${selectorVariableName} has no value`);
    }
    return branchName(targetBranchName);
  }
});
