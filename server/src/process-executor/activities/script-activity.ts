import { ScriptStep } from '@aila/model';
import { createAtomActivity } from 'sequential-workflow-machine';
import { ProcessExecutionGlobalState } from '../process-execution-global-state';

export const scriptStepActivity = createAtomActivity<ScriptStep, ProcessExecutionGlobalState>('script', {
  init: () => ({}),
  handler: async (step: ScriptStep, { $scriptExecutor }: ProcessExecutionGlobalState) => {
    const abortSignal = AbortSignal.timeout(10_000);
    await $scriptExecutor.execute(abortSignal, step.id, step.properties.script);
  }
});
