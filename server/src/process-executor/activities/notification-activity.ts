import { NotificationStep } from '@aila/model';
import { createAtomActivity } from 'sequential-workflow-machine';
import { ProcessExecutionGlobalState } from '../process-execution-global-state';

export const notificationStepActivity = createAtomActivity<NotificationStep, ProcessExecutionGlobalState>('notification', {
  init: () => ({}),
  handler: async (step: NotificationStep, { $notifier, $variableEvaluator }: ProcessExecutionGlobalState) => {
    const abortSignal = AbortSignal.timeout(3_000);

    const expression = $variableEvaluator.evaluateStringOrVariable(step.properties.userExpression);

    await $notifier.notify(abortSignal, expression, step.properties.notification);
  }
});
