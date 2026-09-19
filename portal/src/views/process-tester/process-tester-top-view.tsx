import { ProcessLogLevel, type FormDefinition, type ProcessExecutionVariableValues } from '@ailaflow/shared';
import type { RefObject } from 'react';
import { ProcessOutputValuesView } from '../common/process-output-values-view';

export enum ProcessTesterTimelineItemType {
  FORM = 1,
  LOG = 2,
  ERROR = 3,
  OUTPUT = 4,
  CURRENT_STEP = 5
}

export enum ProcessTesterTimelineFormType {
  START = 1,
  OUTPUT = 2
}

export enum ProcessTesterTimelineFormStatus {
  ACTIVE = 1,
  COMPLETED = 2
}

export interface ProcessTesterTimelineItem {
  readonly id: string;
  readonly type: ProcessTesterTimelineItemType;
  readonly time: number;
}

export class FormProcessTesterTimelineItem implements ProcessTesterTimelineItem {
  public readonly type = ProcessTesterTimelineItemType.FORM;

  public get id(): string {
    return this.formType === ProcessTesterTimelineFormType.START ? 'start-form' : `form-${this.time}`;
  }

  public constructor(
    public readonly time: number,
    public readonly formType: ProcessTesterTimelineFormType,
    public readonly status: ProcessTesterTimelineFormStatus,
    public readonly form?: FormDefinition,
    public readonly output?: ProcessExecutionVariableValues
  ) {}
}

export class LogProcessTesterTimelineItem implements ProcessTesterTimelineItem {
  public readonly type = ProcessTesterTimelineItemType.LOG;

  public get id(): string {
    return `log-${this.time}-${this.level}-${this.message}`;
  }

  public constructor(
    public readonly time: number,
    public readonly level: ProcessLogLevel,
    public readonly message: string
  ) {}
}

export class ErrorProcessTesterTimelineItem implements ProcessTesterTimelineItem {
  public readonly type = ProcessTesterTimelineItemType.ERROR;

  public get id(): string {
    return `error-${this.time}-${this.title}-${this.message}`;
  }

  public constructor(
    public readonly time: number,
    public readonly title: string,
    public readonly message: string
  ) {}
}

export class OutputProcessTesterTimelineItem implements ProcessTesterTimelineItem {
  public readonly type = ProcessTesterTimelineItemType.OUTPUT;

  public get id(): string {
    return `output-${this.time}`;
  }

  public constructor(
    public readonly time: number,
    public readonly output: ProcessExecutionVariableValues
  ) {}
}

export class CurrentStepProcessTesterTimelineItem implements ProcessTesterTimelineItem {
  public readonly type = ProcessTesterTimelineItemType.CURRENT_STEP;

  public get id(): string {
    return `current-step-${this.time}-${this.stepId}`;
  }

  public constructor(
    public readonly time: number,
    public readonly stepId: string,
    public readonly stepName: string
  ) {}
}

export interface ProcessTesterTimelineViewProps {
  items: ProcessTesterTimelineItem[];
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  startForm: React.ReactNode;
  renderOutputForm(form: FormDefinition, output: ProcessExecutionVariableValues): React.ReactNode;
}

export function ProcessTesterTimelineView(props: ProcessTesterTimelineViewProps) {
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

function TimelineMarker(props: { item: ProcessTesterTimelineItem }) {
  let markerClassName = 'border-slate-300 bg-white';
  if (props.item instanceof ErrorProcessTesterTimelineItem) {
    markerClassName = 'border-red-500 bg-red-100';
  } else if (props.item instanceof LogProcessTesterTimelineItem) {
    if (props.item.level === ProcessLogLevel.ERROR) {
      markerClassName = 'border-red-500 bg-red-100';
    } else if (props.item.level === ProcessLogLevel.WARNING) {
      markerClassName = 'border-amber-500 bg-amber-100';
    }
  } else if (
    props.item instanceof OutputProcessTesterTimelineItem ||
    (props.item instanceof FormProcessTesterTimelineItem && props.item.status === ProcessTesterTimelineFormStatus.COMPLETED)
  ) {
    markerClassName = 'border-emerald-500 bg-emerald-100';
  } else if (props.item instanceof FormProcessTesterTimelineItem) {
    markerClassName = 'border-blue-500 bg-blue-100';
  } else if (props.item instanceof CurrentStepProcessTesterTimelineItem) {
    markerClassName = 'border-blue-500 bg-blue-100';
  }

  return <span className={`absolute left-0 top-1.5 size-4 rounded-full border-2 ${markerClassName}`} aria-hidden="true" />;
}

function TimelineItem(props: Pick<ProcessTesterTimelineViewProps, 'startForm' | 'renderOutputForm'> & { item: ProcessTesterTimelineItem }) {
  const { item } = props;
  if (item instanceof FormProcessTesterTimelineItem) {
    return <FormTimelineItem item={item} startForm={props.startForm} renderOutputForm={props.renderOutputForm} />;
  }
  if (item instanceof ErrorProcessTesterTimelineItem) {
    return <ErrorTimelineItem item={item} />;
  }
  if (item instanceof OutputProcessTesterTimelineItem) {
    return <OutputTimelineItem item={item} />;
  }
  if (item instanceof LogProcessTesterTimelineItem) {
    return <LogTimelineItem item={item} />;
  }
  if (item instanceof CurrentStepProcessTesterTimelineItem) {
    return <CurrentStepTimelineItem item={item} />;
  }
  return null;
}

function CurrentStepTimelineItem(props: { item: CurrentStepProcessTesterTimelineItem }) {
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

function ErrorTimelineItem(props: { item: ErrorProcessTesterTimelineItem }) {
  return (
    <article className="w-full min-w-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
      <TimelineItemHeader title={props.item.title} time={props.item.time} tone="error" />
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-red-800">
        {props.item.message}
      </pre>
    </article>
  );
}

function OutputTimelineItem(props: { item: OutputProcessTesterTimelineItem }) {
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

function LogTimelineItem(props: { item: LogProcessTesterTimelineItem }) {
  const isError = props.item.level === ProcessLogLevel.ERROR;
  const isWarning = props.item.level === ProcessLogLevel.WARNING;
  return (
    <article
      className={`flex w-full min-w-0 items-start gap-3 rounded-lg border px-3.5 py-2.5 shadow-sm ${
        isError ? 'border-red-200 bg-red-50' : isWarning ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'
      }`}
    >
      <p
        className={`min-w-0 flex-1 break-words font-mono text-xs leading-5 ${
          isError ? 'text-red-800' : isWarning ? 'text-amber-900' : 'text-slate-700'
        }`}
      >
        {props.item.message}
      </p>
      <TimelineTime time={props.item.time} />
    </article>
  );
}

function FormTimelineItem(
  props: Pick<ProcessTesterTimelineViewProps, 'startForm' | 'renderOutputForm'> & { item: FormProcessTesterTimelineItem }
) {
  const { item } = props;
  const isCompleted = item.status === ProcessTesterTimelineFormStatus.COMPLETED;
  const isStartForm = item.formType === ProcessTesterTimelineFormType.START;
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

function TimelineItemHeader(props: { title: string; time: number; tone: 'error' | 'success' }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2">
      <h2 className={`text-sm font-semibold ${props.tone === 'error' ? 'text-red-900' : 'text-slate-900'}`}>{props.title}</h2>
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
