import { ProcessCronJobDto, ProcessCronJobRun, ProcessCronJobRunStatus } from '@aila/model';

export interface ProcessCronJobDraftViewModel {
  id: string | null;
  expression: string;
  timeZone: string;
  inputValuesText: string;
  isEnabled: boolean;
}

export interface ProcessCronJobsViewProps {
  jobs: ProcessCronJobDto[];
  draft: ProcessCronJobDraftViewModel | null;
  expressionError: string | null;
  inputValuesError: string | null;
  isSaving: boolean;
  canSave: boolean;
  onCreate(): void;
  onEdit(job: ProcessCronJobDto): void;
  onDelete(job: ProcessCronJobDto): void;
  onToggle(job: ProcessCronJobDto): void;
  onDraftChange(changes: Partial<ProcessCronJobDraftViewModel>): void;
  onSave(): void;
  onCancel(): void;
}

export function ProcessCronJobsView(props: ProcessCronJobsViewProps) {
  return (
    <div className="h-full min-h-0 overflow-y-auto bg-slate-50">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 p-4 sm:p-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Cron jobs</h1>
            <p className="mt-1 text-sm text-slate-500">Configure scheduled process runs and their input values.</p>
          </div>
          <button
            type="button"
            onClick={props.onCreate}
            className="inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700"
          >
            Create cron job
          </button>
        </header>

        {props.draft ? <CronJobEditor {...props} draft={props.draft} /> : null}

        {props.jobs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-500">
            No cron jobs have been configured for this process.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {props.jobs.map(job => (
              <CronJobItem key={job.id} job={job} onEdit={props.onEdit} onDelete={props.onDelete} onToggle={props.onToggle} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CronJobEditor(props: ProcessCronJobsViewProps & { draft: ProcessCronJobDraftViewModel }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Cron job editor">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{props.draft.id ? 'Edit cron job' : 'New cron job'}</h2>
        <span className="text-xs text-slate-500">Five-field cron expression</span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <TextField
            label="Expression"
            value={props.draft.expression}
            placeholder="0 9 * * *"
            error={props.expressionError}
            onChange={expression => props.onDraftChange({ expression })}
          />
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-xs text-slate-500">Examples:</span>
            {expressionExamples.map(example => (
              <button
                key={example.expression}
                type="button"
                title={example.expression}
                onClick={() => props.onDraftChange({ expression: example.expression })}
                className={`text-xs font-medium underline decoration-slate-300 underline-offset-2 transition-colors hover:text-slate-900 ${
                  props.draft.expression === example.expression ? 'text-slate-900' : 'text-slate-600'
                }`}
              >
                {example.label}
              </button>
            ))}
          </div>
        </div>
        <TextField
          label="Time zone"
          value={props.draft.timeZone}
          placeholder="Europe/Warsaw"
          onChange={timeZone => props.onDraftChange({ timeZone })}
        />
      </div>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Input values</span>
        <textarea
          value={props.draft.inputValuesText}
          onChange={event => props.onDraftChange({ inputValuesText: event.currentTarget.value })}
          rows={8}
          spellCheck={false}
          aria-invalid={Boolean(props.inputValuesError)}
          className={`w-full resize-y rounded-md border bg-white px-3 py-2 font-mono text-sm leading-6 text-slate-900 outline-none transition-colors ${
            props.inputValuesError ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'
          }`}
        />
        {props.inputValuesError ? <span className="mt-1 block text-xs text-red-700">{props.inputValuesError}</span> : null}
      </label>
      <label className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={props.draft.isEnabled}
          onChange={event => props.onDraftChange({ isEnabled: event.currentTarget.checked })}
          className="size-4 rounded border-slate-300"
        />
        Enabled
      </label>
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={props.onCancel}
          className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!props.canSave}
          onClick={props.onSave}
          className="inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {props.isSaving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </section>
  );
}

function TextField(props: { label: string; value: string; placeholder: string; error?: string | null; onChange(value: string): void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{props.label}</span>
      <input
        type="text"
        value={props.value}
        placeholder={props.placeholder}
        onChange={event => props.onChange(event.currentTarget.value)}
        aria-invalid={Boolean(props.error)}
        className={`h-10 w-full rounded-md border bg-white px-3 font-mono text-sm text-slate-900 outline-none ${
          props.error ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'
        }`}
      />
      {props.error ? <span className="mt-1 block text-xs text-red-700">{props.error}</span> : null}
    </label>
  );
}

function CronJobItem(props: {
  job: ProcessCronJobDto;
  onEdit(job: ProcessCronJobDto): void;
  onDelete(job: ProcessCronJobDto): void;
  onToggle(job: ProcessCronJobDto): void;
}) {
  const job = props.job;
  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <code className="break-all text-base font-semibold text-slate-900">{job.expression}</code>
          <p className="mt-1 text-xs text-slate-500">{job.timeZone}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            job.isEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {job.isEnabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      <LastRunStatus run={job.lastRun} />

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Next execution</dt>
          <dd className="mt-1 text-slate-700">{formatTime(job.nextExecutionAt)}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Input values</dt>
          <dd className="mt-1 truncate font-mono text-xs text-slate-700">{JSON.stringify(job.inputValues)}</dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
        <button className={secondaryButtonClass} type="button" onClick={() => props.onToggle(job)}>
          {job.isEnabled ? 'Disable' : 'Enable'}
        </button>
        <button className={secondaryButtonClass} type="button" onClick={() => props.onEdit(job)}>
          Edit
        </button>
        <button
          className="inline-flex h-8 items-center rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50"
          type="button"
          onClick={() => props.onDelete(job)}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

function LastRunStatus(props: { run: ProcessCronJobRun | null }) {
  if (!props.run) {
    return <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">Never run</div>;
  }
  const status = getRunStatus(props.run.status);
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${status.className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{status.label}</span>
        <span className="text-xs">{formatTime(props.run.finishedAt ?? props.run.startedAt)}</span>
      </div>
      {props.run.error ? <p className="mt-1 break-words text-xs">{props.run.error}</p> : null}
    </div>
  );
}

function getRunStatus(status: ProcessCronJobRunStatus): { label: string; className: string } {
  switch (status) {
    case ProcessCronJobRunStatus.RUNNING:
      return { label: 'Running', className: 'border-blue-200 bg-blue-50 text-blue-800' };
    case ProcessCronJobRunStatus.SUCCEEDED:
      return { label: 'Succeeded', className: 'border-emerald-200 bg-emerald-50 text-emerald-800' };
    case ProcessCronJobRunStatus.FAILED:
      return { label: 'Failed', className: 'border-red-200 bg-red-50 text-red-800' };
  }
}

function formatTime(value: number | null): string {
  return value === null ? 'Not scheduled' : new Date(value).toLocaleString();
}

const secondaryButtonClass =
  'inline-flex h-8 items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50';

const expressionExamples = [
  { label: 'Every 10 minutes', expression: '*/10 * * * *' },
  { label: 'Every hour', expression: '0 * * * *' },
  { label: 'Every day at 12:00', expression: '0 12 * * *' }
] as const;
