import {
  ProcessCronJobDto,
  ProcessCronJobExpressionValidator,
  ProcessDto,
  ProcessExecutionVariableValues,
  VariableCachedValidator
} from '@aila/model';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { ProcessCronJobDraftViewModel, ProcessCronJobsView } from '../../views/process-cron-jobs/process-cron-jobs-view';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';

export interface ProcessCronJobsProps {
  process: ProcessDto;
  initialJobs: ProcessCronJobDto[];
}

export function ProcessCronJobs(props: ProcessCronJobsProps) {
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const variableValidator = useMemo(() => new VariableCachedValidator(), []);
  const [jobs, setJobs] = useState(props.initialJobs);
  const [draft, setDraft] = useState<ProcessCronJobDraftViewModel | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const expressionError = draft ? ProcessCronJobExpressionValidator.validate(draft.expression, draft.timeZone) : null;
  const inputValidation = draft
    ? validateInputValues(draft.inputValuesText, props.process, variableValidator)
    : { inputValues: null, error: null };
  const canSave = draft !== null && expressionError === null && inputValidation.error === null && !isSaving;

  function createJob(): void {
    setDraft({
      id: null,
      expression: '0 9 * * *',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      inputValuesText: '{}',
      isEnabled: true
    });
  }

  function editJob(job: ProcessCronJobDto): void {
    setDraft({
      id: job.id,
      expression: job.expression,
      timeZone: job.timeZone,
      inputValuesText: JSON.stringify(job.inputValues, null, 2),
      isEnabled: job.isEnabled
    });
  }

  async function refreshJobs(): Promise<void> {
    const response = await apiClient.process.getProcessCronJobs(AbortSignal.timeout(10_000), props.process.name);
    setJobs(response.jobs);
  }

  async function save(): Promise<void> {
    if (!draft || !canSave || !inputValidation.inputValues) {
      return;
    }
    setIsSaving(true);
    try {
      await apiClient.process.saveProcessCronJob(AbortSignal.timeout(10_000), {
        insert: draft.id === null,
        id: draft.id ?? undefined,
        processName: props.process.name,
        expression: draft.expression,
        timeZone: draft.timeZone,
        inputValues: inputValidation.inputValues,
        isEnabled: draft.isEnabled
      });
      await refreshJobs();
      setDraft(null);
    } catch (error) {
      window.alert(`Failed to save cron job: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteJob(job: ProcessCronJobDto): Promise<void> {
    if (!window.confirm(`Delete cron job "${job.expression}"?`)) {
      return;
    }
    try {
      await apiClient.process.deleteProcessCronJob(AbortSignal.timeout(10_000), job.id);
      setJobs(current => current.filter(item => item.id !== job.id));
      if (draft?.id === job.id) {
        setDraft(null);
      }
    } catch (error) {
      window.alert(`Failed to delete cron job: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function toggleJob(job: ProcessCronJobDto): Promise<void> {
    try {
      await apiClient.process.saveProcessCronJob(AbortSignal.timeout(10_000), {
        insert: false,
        id: job.id,
        processName: job.processName,
        expression: job.expression,
        timeZone: job.timeZone,
        inputValues: job.inputValues,
        isEnabled: !job.isEnabled
      });
      await refreshJobs();
    } catch (error) {
      window.alert(`Failed to update cron job: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function updateDraft(changes: Partial<ProcessCronJobDraftViewModel>): void {
    setDraft(current => (current ? { ...current, ...changes } : current));
  }

  return (
    <ResourceEditorView
      icon="/"
      name={props.process.name}
      isNameReadOnly={true}
      isNameValid={true}
      switchLabel="Edit"
      canSwitch={true}
      onSwitch={() => navigate(`/admin/processes/${encodeURIComponent(props.process.name)}`)}
    >
      <ProcessCronJobsView
        jobs={jobs}
        draft={draft}
        expressionError={expressionError}
        inputValuesError={inputValidation.error}
        isSaving={isSaving}
        canSave={canSave}
        onCreate={createJob}
        onEdit={editJob}
        onDelete={deleteJob}
        onToggle={toggleJob}
        onDraftChange={updateDraft}
        onSave={save}
        onCancel={() => setDraft(null)}
      />
    </ResourceEditorView>
  );
}

interface InputValuesValidationResult {
  inputValues: ProcessExecutionVariableValues | null;
  error: string | null;
}

function validateInputValues(input: string, process: ProcessDto, variableValidator: VariableCachedValidator): InputValuesValidationResult {
  let value: unknown;
  try {
    value = JSON.parse(input);
  } catch (error) {
    return { inputValues: null, error: `Invalid JSON: ${error instanceof Error ? error.message : String(error)}` };
  }

  const inputValues = value as ProcessExecutionVariableValues;
  const error = variableValidator.validateVariablesValue(process.definition.properties.startVariableNames, inputValues, process.definition);
  return { inputValues, error };
}
