import { ProcessLog, ProcessLogLevel, type FormDefinition, type ProcessExecutionVariableValues } from '@ailaflow/shared';
import type { RefObject } from 'react';
import { ProcessOutputValuesView } from './process-output-values-view';

export enum ProcessExecutionTimelineItemType {
  FORM = 1,
  LOG = 2,
  ERROR = 3,
  OUTPUT = 4,
  CURRENT_STEP = 5,
  FORM_ERROR = 6
}

export enum ProcessExecutionTimelineFormType {
  START = 1,
  OUTPUT = 2
}

export enum ProcessExecutionTimelineFormStatus {
  ACTIVE = 1,
  COMPLETED = 2
}

export interface ProcessExecutionTimelineItem {
  readonly id: string;
  readonly type: ProcessExecutionTimelineItemType;
  readonly time: number;
}

export class FormProcessExecutionTimelineItem implements ProcessExecutionTimelineItem {
  public readonly type = ProcessExecutionTimelineItemType.FORM;

  public get id(): string {
    return this.formType === ProcessExecutionTimelineFormType.START ? 'start-form' : `form-${this.time}`;
  }

  public constructor(
    public readonly time: number,
    public readonly formType: ProcessExecutionTimelineFormType,
    public readonly status: ProcessExecutionTimelineFormStatus,
    public readonly form?: FormDefinition,
    public readonly output?: ProcessExecutionVariableValues
  ) {}
}

export class LogProcessExecutionTimelineItem implements ProcessExecutionTimelineItem {
  public readonly type = ProcessExecutionTimelineItemType.LOG;
  public readonly level: ProcessLogLevel;
  public readonly time: number;
  public readonly header: string;
  public readonly content: string;

  public get id(): string {
    return `log-${this.log[0]}-${this.log[1]}`;
  }

  public constructor(public readonly log: ProcessLog) {
    this.time = log[0];
    this.level = log[1];
    const [h, c] = formatLogMessage(log);
    this.header = h;
    this.content = c;
  }
}

export class ErrorProcessExecutionTimelineItem implements ProcessExecutionTimelineItem {
  public readonly type = ProcessExecutionTimelineItemType.ERROR;

  public get id(): string {
    return `error-${this.time}-${this.title}-${this.message}`;
  }

  public constructor(
    public readonly time: number,
    public readonly title: string,
    public readonly message: string
  ) {}
}

export class FormErrorProcessExecutionTimelineItem implements ProcessExecutionTimelineItem {
  public readonly type = ProcessExecutionTimelineItemType.FORM_ERROR;

  public get id(): string {
    return `form-error-${this.time}-${this.message}`;
  }

  public constructor(
    public readonly time: number,
    public readonly message: string,
    public readonly stack?: string
  ) {}
}

export class OutputProcessExecutionTimelineItem implements ProcessExecutionTimelineItem {
  public readonly type = ProcessExecutionTimelineItemType.OUTPUT;

  public get id(): string {
    return `output-${this.time}`;
  }

  public constructor(
    public readonly time: number,
    public readonly output: ProcessExecutionVariableValues
  ) {}
}

export class CurrentStepProcessExecutionTimelineItem implements ProcessExecutionTimelineItem {
  public readonly type = ProcessExecutionTimelineItemType.CURRENT_STEP;

  public get id(): string {
    return `current-step-${this.time}-${this.stepId}`;
  }

  public constructor(
    public readonly time: number,
    public readonly stepId: string,
    public readonly stepName: string
  ) {}
}

export interface ProcessExecutionTimelineViewProps {
  items: ProcessExecutionTimelineItem[];
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  startForm: React.ReactNode;
  renderOutputForm(form: FormDefinition, output: ProcessExecutionVariableValues): React.ReactNode;
}

export function ProcessExecutionTimelineView(props: ProcessExecutionTimelineViewProps) {
  return (
    <section className="h-full min-h-0 overflow-hidden bg-slate-50" aria-label="Process execution timeline">
      <div ref={props.scrollContainerRef} className="h-full overflow-y-auto overscroll-contain scroll-smooth">
        <ol className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-7">
          {props.items.map((item, index) => (
            <li
              key={item.id}
              className={`relative pl-8 sm:pl-10 ${
                index < props.items.length - 1
                  ? 'pb-5 before:absolute before:bottom-[-0.375rem] before:left-[0.4375rem] before:top-5 before:w-px before:bg-slate-200'
                  : ''
              }`}
            >
              <TimelineMarker item={item} />
              <TimelineItem item={item} startForm={props.startForm} renderOutputForm={props.renderOutputForm} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function TimelineMarker(props: { item: ProcessExecutionTimelineItem }) {
  let markerClassName = 'border-slate-300 bg-white';
  if (props.item instanceof FormErrorProcessExecutionTimelineItem) {
    markerClassName = 'border-orange-600 bg-orange-200';
  } else if (props.item instanceof ErrorProcessExecutionTimelineItem) {
    markerClassName = 'border-red-500 bg-red-100';
  } else if (props.item instanceof LogProcessExecutionTimelineItem) {
    if (props.item.level === ProcessLogLevel.ERROR) {
      markerClassName = 'border-red-500 bg-red-100';
    } else if (props.item.level === ProcessLogLevel.WARNING) {
      markerClassName = 'border-amber-500 bg-amber-100';
    }
  } else if (
    props.item instanceof OutputProcessExecutionTimelineItem ||
    (props.item instanceof FormProcessExecutionTimelineItem && props.item.status === ProcessExecutionTimelineFormStatus.COMPLETED)
  ) {
    markerClassName = 'border-emerald-500 bg-emerald-100';
  } else if (props.item instanceof FormProcessExecutionTimelineItem) {
    markerClassName = 'border-blue-500 bg-blue-100';
  } else if (props.item instanceof CurrentStepProcessExecutionTimelineItem) {
    markerClassName = 'border-blue-500 bg-blue-100';
  }

  return <span className={`absolute left-0 top-1.5 size-4 rounded-full border-2 ${markerClassName}`} aria-hidden="true" />;
}

function TimelineItem(
  props: Pick<ProcessExecutionTimelineViewProps, 'startForm' | 'renderOutputForm'> & { item: ProcessExecutionTimelineItem }
) {
  const { item } = props;
  if (item instanceof FormProcessExecutionTimelineItem) {
    return <FormTimelineItem item={item} startForm={props.startForm} renderOutputForm={props.renderOutputForm} />;
  }
  if (item instanceof ErrorProcessExecutionTimelineItem) {
    return <ErrorTimelineItem item={item} />;
  }
  if (item instanceof FormErrorProcessExecutionTimelineItem) {
    return <FormErrorTimelineItem item={item} />;
  }
  if (item instanceof OutputProcessExecutionTimelineItem) {
    return <OutputTimelineItem item={item} />;
  }
  if (item instanceof LogProcessExecutionTimelineItem) {
    return <LogTimelineItem item={item} />;
  }
  if (item instanceof CurrentStepProcessExecutionTimelineItem) {
    return <CurrentStepTimelineItem item={item} />;
  }
  return null;
}

function CurrentStepTimelineItem(props: { item: CurrentStepProcessExecutionTimelineItem }) {
  return (
    <article className="flex w-full min-w-0 items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-blue-600">Current step</p>
        <p className="mt-0.5 break-words text-sm font-medium text-blue-900">{props.item.stepName}</p>
      </div>
      <TimelineTime time={props.item.time} />
    </article>
  );
}

function ErrorTimelineItem(props: { item: ErrorProcessExecutionTimelineItem }) {
  return (
    <article className="w-full min-w-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
      <TimelineItemHeader title={props.item.title} time={props.item.time} tone="error" />
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-red-800">
        {props.item.message}
      </pre>
    </article>
  );
}

function FormErrorTimelineItem(props: { item: FormErrorProcessExecutionTimelineItem }) {
  return (
    <article className="w-full min-w-0 rounded-lg border border-orange-300 bg-orange-100 px-4 py-3 shadow-sm">
      <TimelineItemHeader title="Form error" time={props.item.time} tone="error" />
      <p className="mt-2 break-words text-sm text-orange-950">{props.item.message}</p>
      {props.item.stack && (
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words border-t border-orange-300 pt-2 font-mono text-xs leading-5 text-orange-900">
          {props.item.stack}
        </pre>
      )}
    </article>
  );
}

function OutputTimelineItem(props: { item: OutputProcessExecutionTimelineItem }) {
  return (
    <article className="w-full min-w-0 rounded-lg border border-emerald-200 bg-white px-4 py-3 shadow-sm">
      <TimelineItemHeader title="Process finished" time={props.item.time} tone="success" />
      {Object.keys(props.item.output).length > 0 ? (
        <ProcessOutputValuesView outputValues={props.item.output} />
      ) : (
        <p className="mt-2 text-sm text-slate-500">No output values.</p>
      )}
    </article>
  );
}

function LogTimelineItem(props: { item: LogProcessExecutionTimelineItem }) {
  const isError = props.item.level === ProcessLogLevel.ERROR;
  const isWarning = props.item.level === ProcessLogLevel.WARNING;
  return (
    <article
      className={`w-full min-w-0 rounded-lg border px-4 py-3 shadow-sm ${
        isError ? 'border-red-200 bg-red-50' : isWarning ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'
      }`}
    >
      <TimelineItemHeader title={props.item.header} time={props.item.time} tone={isError ? 'error' : isWarning ? 'warning' : 'default'} />
      <pre
        className={`mt-2 min-w-0 whitespace-pre-wrap break-words font-mono text-xs leading-5 ${
          isError ? 'text-red-800' : isWarning ? 'text-amber-900' : 'text-slate-700'
        }`}
      >
        {props.item.content}
      </pre>
    </article>
  );
}

function FormTimelineItem(
  props: Pick<ProcessExecutionTimelineViewProps, 'startForm' | 'renderOutputForm'> & {
    item: FormProcessExecutionTimelineItem;
  }
) {
  const { item } = props;
  const isCompleted = item.status === ProcessExecutionTimelineFormStatus.COMPLETED;
  const isStartForm = item.formType === ProcessExecutionTimelineFormType.START;
  const isDisabled = isStartForm && isCompleted;
  const content = isStartForm ? props.startForm : item.form && item.output ? props.renderOutputForm(item.form, item.output) : null;
  return (
    <article className="flex h-96 min-h-72 w-full min-w-0 resize-y flex-col overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-none flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-slate-100 px-4 py-3 sm:px-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">{isStartForm ? 'Start form' : 'Process output'}</h2>
            <span
              className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-medium ${
                isCompleted ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
              }`}
            >
              {isCompleted ? 'Completed' : 'Waiting for input'}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {isStartForm
              ? isCompleted
                ? 'Submitted input'
                : 'Fill in the input to start this process.'
              : 'The process finished successfully.'}
          </p>
        </div>
        <TimelineTime time={item.time} />
      </header>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          inert={isDisabled || undefined}
          aria-disabled={isDisabled || undefined}
          className={`h-full transition-[filter,opacity] ${isDisabled ? 'pointer-events-none select-none opacity-55 grayscale' : ''}`}
        >
          {content}
        </div>
        {isDisabled && <div className="pointer-events-none absolute inset-0 bg-slate-50/10" aria-hidden="true" />}
      </div>
    </article>
  );
}

function TimelineItemHeader(props: { title: string; time: number; tone: 'default' | 'error' | 'success' | 'warning' }) {
  const titleClassName = props.tone === 'error' ? 'text-red-900' : props.tone === 'warning' ? 'text-amber-900' : 'text-slate-900';
  return (
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h2 className={`text-sm font-semibold ${titleClassName}`}>{props.title}</h2>
      <TimelineTime time={props.time} />
    </header>
  );
}

function TimelineTime(props: { time: number }) {
  const date = new Date(props.time);
  return (
    <time
      dateTime={date.toISOString()}
      title={date.toLocaleString()}
      className="shrink-0 font-mono text-[0.6875rem] tabular-nums text-slate-400"
    >
      {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </time>
  );
}

function formatLogMessage(log: ProcessLog): [string, string] {
  const level = log[1];
  if (level === ProcessLogLevel.AGENT_RESPONSE) {
    return ['Agent', log[2]];
  }
  if (level === ProcessLogLevel.AGENT_TOOL_CALL) {
    return ['Tool call', `${log[3]} ${log[4]}`];
  }
  if (level === ProcessLogLevel.AGENT_TOOL_RESPONSE) {
    return ['Tool response', log[3]];
  }
  if (level === ProcessLogLevel.MATERIALIZER_STDOUT) {
    return ['Materializer stdout', log[2]];
  }
  if (level === ProcessLogLevel.MATERIALIZER_STDERR) {
    return ['Materializer stderr', log[2]];
  }
  if (level === ProcessLogLevel.SCRIPT_STDOUT) {
    return ['Script stdout', log[2]];
  }
  if (level === ProcessLogLevel.SCRIPT_STDERR) {
    return ['Script stderr', log[2]];
  }
  if (level === ProcessLogLevel.SCRIPT_FINISHED) {
    return ['Script finished', `${log[2]}ms with code ${log[3]}`];
  }
  return ['Info', log[2]];
}
