import { JsonSchema, TaskDeadlinePresetEvaluator, TaskStep } from '@ailaflow/shared';
import { createSignalActivity, SignalPayload } from 'sequential-workflow-machine';
import { ProcessExecutionGlobalState } from '../process-execution-global-state';
import { ProcessVariableManager } from '../services/process-variable-manager';

function evaluateDeadline(step: TaskStep, variables: ProcessVariableManager): number | null {
  let deadline: number | null = null;
  if (step.properties.deadline) {
    const now = Date.now();
    if (step.properties.deadline.type === 'string') {
      deadline = TaskDeadlinePresetEvaluator.evaluate(step.properties.deadline.value) + now;
    } else if (step.properties.deadline.type === 'variable') {
      const value = variables.get(step.properties.deadline.name);
      if (typeof value === 'string') {
        deadline = new Date(value).getTime();
        if (isNaN(deadline)) {
          throw new Error(`Invalid deadline value: ${value}`);
        }
      }
    }
    if (deadline !== null && deadline <= now) {
      throw new Error(`Deadline is set in the past: ${new Date(deadline).toISOString()}`);
    }
  }
  return deadline;
}

export const taskStepActivity = createSignalActivity<TaskStep, ProcessExecutionGlobalState>('task', {
  init: () => ({}),
  beforeSignal: async (step: TaskStep, globalState: ProcessExecutionGlobalState) => {
    const title = globalState.variableEvaluator.evaluateStringOrVariable(step.properties.title);
    const userExpression = globalState.variableEvaluator.evaluateStringOrVariable(step.properties.userExpression);

    const outputVariableSchemas: Record<string, JsonSchema> = {};
    for (const name of step.properties.outputVariableNames) {
      outputVariableSchemas[name] = globalState.variables.getSchema(name);
    }

    const deadline = evaluateDeadline(step, globalState.variables);

    const createSignal = AbortSignal.any([globalState.stopSignal, AbortSignal.timeout(5_000)]);

    await globalState.taskCreator.create(
      createSignal,
      globalState.context.isTest,
      globalState.context.startedBy,
      globalState.executionId,
      globalState.process.name,
      title,
      userExpression,
      deadline,
      step.properties.finalizationPolicy,
      step.properties.metadataVariableName ?? null,
      step.properties.inputVariableNames,
      step.properties.outputVariableNames.length > 0 ? outputVariableSchemas : null,
      step.properties.form,
      step.properties.submissionMode
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
    if (step.properties.metadataVariableName) {
      const value = payload[step.properties.metadataVariableName];
      variables.set(step.properties.metadataVariableName, value);
    }
  }
});
