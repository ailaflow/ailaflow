import { ProcessCronJobsView } from '../../views/process-cron-jobs/process-cron-jobs-view';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { useUnsavedChangesController } from '../common/admin-portal';
import { useProcessCronJobsAi } from './process-cron-jobs-ai';
import { useProcessCronJobs } from './process-cron-jobs-context';

export function ProcessCronJobs() {
  const state = useProcessCronJobs();

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
    <ResourceEditorView
      icon="/"
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
        inputValuesError={state.inputValuesError}
        canSave={state.canSave}
        onCreate={state.createJob}
        onEdit={state.editJob}
        onDelete={job => void deleteJob(job.id)}
        onDraftChange={state.updateDraft}
        onSave={() => void save()}
        onCancel={state.cancelDraft}
      />
    </ResourceEditorView>
  );
}
