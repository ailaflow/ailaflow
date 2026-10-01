import { DEFAULT_CHANNEL_NAME, NotificationStep } from '@ailaflow/shared';
import { createAtomActivity } from 'sequential-workflow-machine';
import { ProcessExecutionGlobalState } from '../process-execution-global-state';

export const notificationStepActivity = createAtomActivity<NotificationStep, ProcessExecutionGlobalState>('notification', {
  init: () => ({}),
  handler: async (step: NotificationStep, { stopSignal, context, process, notifier, variableEvaluator }: ProcessExecutionGlobalState) => {
    const expression = variableEvaluator.evaluateStringOrVariable(step.properties.userExpression);
    const notification = variableEvaluator.evaluateStringOrVariable(step.properties.notification);

    const signal = AbortSignal.any([stopSignal, AbortSignal.timeout(5_000)]);

    await notifier.notifyUsersMatchingAccessExpression(
      signal,
      process.name,
      context.isTest,
      expression,
      DEFAULT_CHANNEL_NAME,
      notification
    );
  }
});
