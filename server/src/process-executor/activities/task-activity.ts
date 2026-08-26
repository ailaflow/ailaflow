import { TaskStep } from '@aila/model';
import { createSignalActivity, SignalPayload } from 'sequential-workflow-machine';
import { ProcessExecutionGlobalState } from '../process-execution-global-state';

export const taskStepActivity = createSignalActivity<TaskStep, ProcessExecutionGlobalState>('task', {
  init: () => ({}),
  beforeSignal: async (step: TaskStep, globalState: ProcessExecutionGlobalState) => {
    const abortSignal = AbortSignal.timeout(5_000);
    await globalState.taskCreator.create(
      abortSignal,
      globalState.executionId,
      globalState.context.isTest,
      step,
      globalState.variableEvaluator,
      globalState.variables
    );
  },
  afterSignal: async (step: TaskStep, { variables }: ProcessExecutionGlobalState, _: object, payload: SignalPayload) => {
    for (const name of step.properties.outputVariableNames) {
      if (!(name in payload)) {
        throw new Error(`Missing task output variable: ${name}`);
      }
    }
    for (const name of step.properties.outputVariableNames) {
      const value = payload[name];
      variables.set(name, value);
    }
  }
});
