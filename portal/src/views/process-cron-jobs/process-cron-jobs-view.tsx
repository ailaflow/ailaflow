import { ProcessCronJobDto, ProcessCronJobRun, ProcessCronJobRunStatus } from '@ailaflow/shared';
import { CodeMirror } from '../common/codemirror';
import { SvgIcon } from '../common/svg-icons';

export interface ProcessCronJobDraftViewModel {
  id: string | null;
  starterUserName: string;
  expression: string;
  timeZone: string;
  maxExecutionTime: number;
  startValuesText: string;
  isEnabled: boolean;
}

export interface ProcessCronJobsViewProps {
  jobs: ProcessCronJobDto[];
  draft: ProcessCronJobDraftViewModel | null;
  expressionError: string | null;
  maxExecutionTimeError: string | null;
  startValuesError: string | null;
  canSave: boolean;
  onCreate(): void;
  onEdit(job: ProcessCronJobDto): void;
  onDelete(job: ProcessCronJobDto): void;
  onFindStarterUser(): void;
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
            <p className="mt-1 text-sm text-slate-500">Configure scheduled process runs and their start values.</p>
          </div>
          <button
            type="button"
            onClick={props.onCreate}
            className="cursor-pointer inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700"
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
          <div className="flex flex-col gap-3">
            {props.jobs.map(job => (
              <CronJobItem key={job.id} job={job} onEdit={props.onEdit} onDelete={props.onDelete} />
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
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Starter user</span>
          <div className="flex gap-2">
            <div
              className={`flex h-9 min-w-0 flex-1 items-center rounded-md border bg-slate-50 px-3 text-sm text-slate-900 ${
                props.draft.starterUserName ? 'border-slate-200' : 'border-red-300'
              }`}
            >
              <span className="truncate">{props.draft.starterUserName ? `@${props.draft.starterUserName}` : 'No user selected'}</span>
            </div>
            <button className={secondaryButtonClass} type="button" onClick={props.onFindStarterUser}>
              Select user
            </button>
          </div>
          {!props.draft.starterUserName ? <span className="mt-1 block text-xs text-red-700">Starter user is required</span> : null}
        </div>
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
                className={`cursor-pointer text-xs font-medium underline decoration-slate-300 underline-offset-2 transition-colors hover:text-slate-900 ${
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
        <NumberField
          label="Max execution time (seconds)"
          value={props.draft.maxExecutionTime}
          min={1}
          max={86_400}
          error={props.maxExecutionTimeError}
          onChange={maxExecutionTime => props.onDraftChange({ maxExecutionTime })}
        />
      </div>
      <div className="mt-4">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Start values</span>
        <div
          className={`flex h-48 min-h-32 resize-y overflow-hidden rounded-md border bg-white transition-colors ${
            props.startValuesError ? 'border-red-300 focus-within:border-red-500' : 'border-slate-200 focus-within:border-slate-400'
          }`}
        >
          <CodeMirror
            value={props.draft.startValuesText}
            language="json"
            ariaLabel="Start values JSON"
            onChange={startValuesText => props.onDraftChange({ startValuesText })}
          />
        </div>
        {props.startValuesError ? (
          <span role="alert" className="mt-1 block text-xs text-red-700">
            {props.startValuesError}
          </span>
        ) : null}
      </div>
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
          className="cursor-pointer inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!props.canSave}
          onClick={props.onSave}
          className="cursor-pointer inline-flex h-9 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Save
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
        className={`h-9 w-full rounded-md border bg-white px-3 font-mono text-sm text-slate-900 outline-none ${
          props.error ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'
        }`}
      />
      {props.error ? <span className="mt-1 block text-xs text-red-700">{props.error}</span> : null}
    </label>
  );
}

function NumberField(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  error?: string | null;
  onChange(value: number): void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{props.label}</span>
      <input
        type="number"
        value={Number.isNaN(props.value) ? '' : props.value}
        min={props.min}
        max={props.max}
        step={1}
        onChange={event => props.onChange(event.currentTarget.valueAsNumber)}
        aria-invalid={Boolean(props.error)}
        className={`h-9 w-full rounded-md border bg-white px-3 font-mono text-sm text-slate-900 outline-none ${
          props.error ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-slate-400'
        }`}
      />
      {props.error ? <span className="mt-1 block text-xs text-red-700">{props.error}</span> : null}
    </label>
  );
}

function CronJobItem(props: { job: ProcessCronJobDto; onEdit(job: ProcessCronJobDto): void; onDelete(job: ProcessCronJobDto): void }) {
  const job = props.job;
  const nextExecution = job.isEnabled ? formatTime(job.nextExecutionAt) : 'Disabled';
  const startValues = JSON.stringify(job.startValues);
  return (
    <article className="relative min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className={`absolute inset-y-0 left-0 w-1 ${job.isEnabled ? 'bg-emerald-400' : 'bg-slate-300'}`} aria-hidden="true" />

      <div className="grid min-w-0 gap-4 p-4 pl-5 lg:grid-cols-[minmax(13rem,0.85fr)_minmax(22rem,1.5fr)_auto] lg:items-center lg:gap-6 sm:p-5 sm:pl-6">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2.5">
            <code className="truncate text-base font-semibold text-slate-900" title={job.expression}>
              {job.expression}
            </code>
          </div>
          <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span>{job.timeZone}</span>
            <span className="size-1 rounded-full bg-slate-300" aria-hidden="true" />
            <span className="truncate text-slate-700">@{job.starterUserName}</span>
          </div>
        </div>

        <dl className="grid min-w-0 grid-cols-2 items-start gap-4">
          <div className="min-w-0">
            <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">Last run</dt>
            <dd className="mt-1 text-sm text-slate-700">
              <LastRunStatus run={job.lastRun} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">Next execution</dt>
            <dd className="mt-1 truncate text-sm font-medium text-slate-800" title={nextExecution}>
              {nextExecution}
            </dd>
          </div>
        </dl>

        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 lg:justify-end lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="shrink-0 lg:text-right">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">Time limit</p>
            <p className="mt-1 text-sm font-medium text-slate-700">{job.maxExecutionTime}s</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
              type="button"
              aria-label="Edit cron job"
              title="Edit"
              onClick={() => props.onEdit(job)}
            >
              <SvgIcon name="pencil" className="size-4" />
            </button>
            <button
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
              type="button"
              aria-label="Delete cron job"
              title="Delete"
              onClick={() => props.onDelete(job)}
            >
              <SvgIcon name="x" className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-w-0 items-center gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 pl-5 sm:px-5 sm:pl-6">
        <span className="shrink-0 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-400">Start values</span>
        <code className="min-w-0 truncate text-xs text-slate-700" title={startValues}>
          {startValues.substring(0, 256)}
        </code>
      </div>
    </article>
  );
}

function LastRunStatus(props: { run: ProcessCronJobRun | null }) {
  if (!props.run) {
    return <>Never run</>;
  }
  const status = getRunStatus(props.run.status);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span>{formatTime(props.run.finishedAt ?? props.run.startedAt)}</span>
        <StatusBadge label={status.label} theme={status.theme} />
      </div>
      {props.run.error ? <p className="mt-1 break-words text-xs text-red-800">{props.run.error}</p> : null}
    </div>
  );
}

type StatusBadgeTheme = 'neutral' | 'info' | 'success' | 'error';

function StatusBadge(props: { label: string; theme: StatusBadgeTheme }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusBadgeThemeClassName(props.theme)}`}
    >
      {props.label}
    </span>
  );
}

function getStatusBadgeThemeClassName(theme: StatusBadgeTheme): string {
  switch (theme) {
    case 'neutral':
      return 'border-slate-200 bg-slate-100 text-slate-600';
    case 'info':
      return 'border-blue-200 bg-blue-50 text-blue-800';
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'error':
      return 'border-red-200 bg-red-50 text-red-800';
  }
}

function getRunStatus(status: ProcessCronJobRunStatus): { label: string; theme: StatusBadgeTheme } {
  switch (status) {
    case ProcessCronJobRunStatus.RUNNING:
      return { label: 'Running', theme: 'info' };
    case ProcessCronJobRunStatus.SUCCEEDED:
      return { label: 'Succeeded', theme: 'success' };
    case ProcessCronJobRunStatus.FAILED:
      return { label: 'Failed', theme: 'error' };
  }
}

function formatTime(value: number | null): string {
  return value === null ? 'Not scheduled' : new Date(value).toLocaleString();
}

const secondaryButtonClass =
  'inline-flex h-9 cursor-pointer items-center rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50';

const expressionExamples = [
  { label: 'Every 10 minutes', expression: '*/10 * * * *' },
  { label: 'Every hour', expression: '0 * * * *' },
  { label: 'Every day at 12:00', expression: '0 12 * * *' }
] as const;
