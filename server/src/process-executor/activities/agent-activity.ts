import { AgentStep } from '@aila/model';
import { createAtomActivityFromHandler } from 'sequential-workflow-machine';
import { ProcessExecutionGlobalState } from '../process-execution-global-state';

export const agentStepActivity = createAtomActivityFromHandler<AgentStep, ProcessExecutionGlobalState>(
  'agent',
  async (step: AgentStep, state: ProcessExecutionGlobalState) => {
    // TODO: Handle the process abort signal here.
    const abortSignal = new AbortController().signal;
    await state.agentSessionRunner.run(abortSignal, step, state);
  }
);
