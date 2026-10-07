import { useState } from 'react';
import { useApiClient } from '../../auth/auth-context';
import { ProcessCronJobsView } from '../../views/process-cron-jobs/process-cron-jobs-view';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { useUnsavedChangesController } from '../common/admin-portal';
import { FindUserPopup } from '../common/popups/find-user-popup';
import { useProcessCronJobsAi } from './process-cron-jobs-ai';
import { useProcessCronJobs } from './process-cron-jobs-context';
import { ProcessIcon } from '../../views/common/process-icon';

export function ProcessCronJobs() {
  const apiClient = useApiClient();
  const state = useProcessCronJobs();
  const [isFindStarterUserPopupOpen, setIsFindStarterUserPopupOpen] = useState(false);

  useProcessCronJobsAi(state);
  useUnsavedChangesController(state.draft !== null);

  async function save(): Promise<void> {
    try {
      await state.save();
    } catch (error) {
      window.alert(`Failed to save cron job: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function deleteJob(id: string): Promise<void> {
    const job = state.jobs.find(item => item.id === id);
    if (!job || !window.confirm(`Delete cron job "${job.expression}"?`)) {
      return;
    }
    try {
      await state.deleteJob(job);
    } catch (error) {
      window.alert(`Failed to delete cron job: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return (
    <>
      <ResourceEditorView
        icon="/"
        leadingVisual={<ProcessIcon name={state.process.name} icon={state.process.icon} className="h-9 w-9" />}
        name={state.process.name}
        isNameReadOnly={true}
        isNameValid={true}
        viewSwitcherOptions={[
          { label: 'Editor', href: `/admin/processes/${state.process.name}` },
          { label: 'Test', href: `/admin/processes/${state.process.name}/test` },
          { label: 'Cron jobs', href: `/admin/processes/${state.process.name}/cron-jobs`, selected: true }
        ]}
        viewSwitcherDisabledReason={state.draft !== null ? 'Please save changes' : undefined}
      >
        <ProcessCronJobsView
          jobs={state.jobs}
          draft={state.draft}
          expressionError={state.expressionError}
          maxExecutionTimeError={state.maxExecutionTimeError}
          inputValuesError={state.inputValuesError}
          canSave={state.canSave}
          onCreate={state.createJob}
          onEdit={state.editJob}
          onDelete={job => void deleteJob(job.id)}
          onFindStarterUser={() => setIsFindStarterUserPopupOpen(true)}
          onDraftChange={state.updateDraft}
          onSave={() => void save()}
          onCancel={() => {
            setIsFindStarterUserPopupOpen(false);
            state.cancelDraft();
          }}
        />
      </ResourceEditorView>
      {isFindStarterUserPopupOpen && state.draft ? (
        <FindUserPopup
          apiClient={apiClient}
          disabledUserNames={[]}
          initialSearch={state.draft.starterUserName}
          title="Select cron job starter"
          description="Choose the user whose permissions will be used to run this process."
          onSelectUser={starterUserName => {
            state.updateDraft({ starterUserName });
            setIsFindStarterUserPopupOpen(false);
          }}
          onClose={() => setIsFindStarterUserPopupOpen(false)}
        />
      ) : null}
    </>
  );
}
