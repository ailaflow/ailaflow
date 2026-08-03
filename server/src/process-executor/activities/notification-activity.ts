import { NotificationStep } from '@aila/model';
import { createAtomActivity } from 'sequential-workflow-machine';
import { ProcessExecutionGlobalState } from '../process-execution-global-state';

export const notificationStepActivity = createAtomActivity<NotificationStep, ProcessExecutionGlobalState>('notification', {
  init: () => ({}),
  handler: async (step: NotificationStep, { $notifier }: ProcessExecutionGlobalState) => {
    const abortSignal = AbortSignal.timeout(3_000);
    await $notifier.notify(abortSignal, step.properties.userExpression, step.properties.notification);
  }
});
