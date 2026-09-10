import { ScriptStep } from '@ailaflow/shared';
import { createAtomActivity } from 'sequential-workflow-machine';
import { ProcessExecutionGlobalState } from '../process-execution-global-state';

export const scriptStepActivity = createAtomActivity<ScriptStep, ProcessExecutionGlobalState>('script', {
  init: () => ({}),
  handler: async (step: ScriptStep, { scriptExecutor }: ProcessExecutionGlobalState) => {
    // TODO: Handle the process abort signal here.
    const abortSignal = new AbortController().signal;
    await scriptExecutor.execute(abortSignal, step.id, step.properties.script);
  }
});
