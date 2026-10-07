import { toolError, toolSuccess } from '@aibindkit/react';
import { useAiStore } from '../common/admin-portal';
import type { ProcessCronJobsState } from './process-cron-jobs-context';

export function useProcessCronJobsAi(state: ProcessCronJobsState) {
  useAiStore(
    'processCronJobs',
    store =>
      store.bind({
        async getJobs() {
          return { processName: state.process.name, jobs: state.jobs };
        },
        async openCronJobEditorOverlay(arg) {
          if (state.draft) {
            return toolError('An overlay is already open');
          }
          if (arg.cronJobId === null) {
            state.createJob();
            return toolSuccess('Cron job editor overlay opened');
          }
          const job = state.jobs.find(item => item.id === arg.cronJobId);
          if (!job) {
            return toolError(`Cannot find cron job "${arg.cronJobId}"`);
          }
          state.editJob(job);
          return toolSuccess('Cron job editor overlay opened');
        },

        // overlay

        async getCurrentOverlay() {
          if (!state.draft) {
            return {
              isOpened: false
            };
          }
          return {
            isOpened: true,
            name: 'cronJobEditor',
            params: {
              cronJobId: state.draft.id
            }
          };
        },
        async closeOverlay() {
          if (!state.draft) {
            return toolError('No overlay is currently open');
          }
          state.cancelDraft();
          return toolSuccess('Overlay was closed');
        },

        // cronJobEditor overlay

        async cronJobEditor_getDetails() {
          if (!state.draft) {
            return toolError('The cron job editor overlay is not open');
          }
          return {
            cronJob: state.draft,
            expressionError: state.expressionError,
            inputValuesError: state.inputValuesError,
            canSave: state.canSave
          };
        },
        async cronJobEditor_setExpression(arg) {
          if (!state.draft) {
            return toolError('The cron job editor overlay is not open');
          }
          state.updateDraft({ expression: arg.expression });
          return toolSuccess('Cron expression was updated');
        },
        async cronJobEditor_setTimeZone(arg) {
          if (!state.draft) {
            return toolError('The cron job editor overlay is not open');
          }
          state.updateDraft({ timeZone: arg.timeZone });
          return toolSuccess('Cron job time zone was updated');
        },
        async cronJobEditor_setMaxExecutionTime(arg) {
          if (!state.draft) {
            return toolError('The cron job editor overlay is not open');
          }
          state.updateDraft({ maxExecutionTime: arg.maxExecutionTime });
          return toolSuccess('Cron job maximum execution time was updated');
        },
        async cronJobEditor_setInputValues(arg) {
          if (!state.draft) {
            return toolError('The cron job editor overlay is not open');
          }
          state.updateDraft({ inputValuesText: JSON.stringify(arg.inputValues, null, 2) });
          return toolSuccess('Cron job input values were updated');
        },
        async cronJobEditor_setIsEnabled(arg) {
          if (!state.draft) {
            return toolError('The cron job editor overlay is not open');
          }
          state.updateDraft({ isEnabled: arg.isEnabled });
          return toolSuccess('Cron job enabled state was updated');
        },
        async cronJobEditor_save() {
          if (!state.draft) {
            return toolError('The cron job editor overlay is not open');
          }
          if (!state.canSave) {
            return toolError(state.expressionError ?? state.maxExecutionTimeError ?? state.inputValuesError ?? 'Cron job cannot be saved');
          }
          try {
            await state.save();
            return toolSuccess('Cron job saved');
          } catch (error) {
            return toolError(error instanceof Error ? error : String(error));
          }
        }
      }),
    [state]
  );
}
