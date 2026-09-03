import {
  ProcessCronJobDto,
  ProcessCronJobExpressionValidator,
  ProcessDto,
  ProcessExecutionVariableValues,
  VariableCachedValidator
} from '@aila/model';
import { createContext, useContext, useMemo, useState } from 'react';
import { useApiClient } from '../../auth/auth-context';
import type { ProcessCronJobDraftViewModel } from '../../views/process-cron-jobs/process-cron-jobs-view';

export interface ProcessCronJobsState {
  process: ProcessDto;
  jobs: ProcessCronJobDto[];
  draft: ProcessCronJobDraftViewModel | null;
  expressionError: string | null;
  inputValuesError: string | null;
  isSaving: boolean;
  canSave: boolean;
  createJob(): void;
  editJob(job: ProcessCronJobDto): void;
  refreshJobs(): Promise<void>;
  save(): Promise<void>;
  deleteJob(job: ProcessCronJobDto): Promise<void>;
  setJobEnabled(job: ProcessCronJobDto, isEnabled: boolean): Promise<void>;
  updateDraft(changes: Partial<ProcessCronJobDraftViewModel>): void;
  cancelDraft(): void;
}

const processCronJobsContext = createContext<ProcessCronJobsState | null>(null);

export function useProcessCronJobs(): ProcessCronJobsState {
  const context = useContext(processCronJobsContext);
  if (!context) {
    throw new Error('Cannot find process cron jobs context');
  }
  return context;
}

export interface ProcessCronJobsContextProps {
  process: ProcessDto;
  initialJobs: ProcessCronJobDto[];
  children: React.ReactNode;
}

export function ProcessCronJobsContext(props: ProcessCronJobsContextProps) {
  const apiClient = useApiClient();
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
      throw new Error('Cannot save cron job due to validation errors or no open draft');
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
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteJob(job: ProcessCronJobDto): Promise<void> {
    await apiClient.process.deleteProcessCronJob(AbortSignal.timeout(10_000), job.id);
    setJobs(current => current.filter(item => item.id !== job.id));
    setDraft(current => (current?.id === job.id ? null : current));
  }

  async function setJobEnabled(job: ProcessCronJobDto, isEnabled: boolean): Promise<void> {
    await apiClient.process.saveProcessCronJob(AbortSignal.timeout(10_000), {
      insert: false,
      id: job.id,
      processName: job.processName,
      expression: job.expression,
      timeZone: job.timeZone,
      inputValues: job.inputValues,
      isEnabled
    });
    await refreshJobs();
  }

  function updateDraft(changes: Partial<ProcessCronJobDraftViewModel>): void {
    setDraft(current => (current ? { ...current, ...changes } : current));
  }

  function cancelDraft(): void {
    setDraft(null);
  }

  const state: ProcessCronJobsState = {
    process: props.process,
    jobs,
    draft,
    expressionError,
    inputValuesError: inputValidation.error,
    isSaving,
    canSave,
    createJob,
    editJob,
    refreshJobs,
    save,
    deleteJob,
    setJobEnabled,
    updateDraft,
    cancelDraft
  };

  return <processCronJobsContext.Provider value={state}>{props.children}</processCronJobsContext.Provider>;
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
