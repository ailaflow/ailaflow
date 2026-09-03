import { useNavigate } from 'react-router-dom';
import { ProcessCronJobsView } from '../../views/process-cron-jobs/process-cron-jobs-view';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { useUnsavedChangesController } from '../common/admin-portal';
import { useProcessCronJobsAi } from './process-cron-jobs-ai';
import { useProcessCronJobs } from './process-cron-jobs-context';

export function ProcessCronJobs() {
  const navigate = useNavigate();
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

  async function toggleJob(id: string): Promise<void> {
    const job = state.jobs.find(item => item.id === id);
    if (!job) {
      return;
    }
    try {
      await state.setJobEnabled(job, !job.isEnabled);
    } catch (error) {
      window.alert(`Failed to update cron job: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return (
    <ResourceEditorView
      icon="/"
      name={state.process.name}
      isNameReadOnly={true}
      isNameValid={true}
      switchLabel="Edit"
      canSwitch={true}
      onSwitch={() => navigate(`/admin/processes/${encodeURIComponent(state.process.name)}`)}
    >
      <ProcessCronJobsView
        jobs={state.jobs}
        draft={state.draft}
        expressionError={state.expressionError}
        inputValuesError={state.inputValuesError}
        isSaving={state.isSaving}
        canSave={state.canSave}
        onCreate={state.createJob}
        onEdit={state.editJob}
        onDelete={job => void deleteJob(job.id)}
        onToggle={job => void toggleJob(job.id)}
        onDraftChange={state.updateDraft}
        onSave={() => void save()}
        onCancel={state.cancelDraft}
      />
    </ResourceEditorView>
  );
}
