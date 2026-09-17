import { AgentStep } from '@ailaflow/shared';
import { createAtomActivityFromHandler } from 'sequential-workflow-machine';
import { ProcessExecutionGlobalState } from '../process-execution-global-state';

export const agentStepActivity = createAtomActivityFromHandler<AgentStep, ProcessExecutionGlobalState>(
  'agent',
  async (step: AgentStep, state: ProcessExecutionGlobalState) => {
    await state.agentSessionRunner.run(state.stopSignal, step, state);
  }
);
