import { NotificationStep } from '@aila/model';
import { createAtomActivity } from 'sequential-workflow-machine';
import { ProcessExecutionGlobalState } from '../process-execution-global-state';

export const notificationStepActivity = createAtomActivity<NotificationStep, ProcessExecutionGlobalState>('notification', {
  init: () => ({}),
  handler: async (step: NotificationStep, { notifier: $notifier, variableEvaluator: $variableEvaluator }: ProcessExecutionGlobalState) => {
    const abortSignal = AbortSignal.timeout(3_000);

    const expression = $variableEvaluator.evaluateStringOrVariable(step.properties.userExpression);
    const notification = $variableEvaluator.evaluateStringOrVariable(step.properties.notification);

    await $notifier.notify(abortSignal, expression, notification);
  }
});
