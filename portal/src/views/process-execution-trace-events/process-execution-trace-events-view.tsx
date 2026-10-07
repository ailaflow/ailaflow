import {
  ProcessExecutionTraceStatus,
  ProcessExecutionTrigger,
  strProcessExecutionTraceStatus,
  strProcessExecutionTrigger,
  type ProcessExecutionTraceDto
} from '@ailaflow/shared';
import { useRef } from 'react';
import { Link } from 'react-router';
import { ProcessExecutionTimelineView, type ProcessExecutionTimelineItem } from '../common/process-execution-timeline-view';

export interface ProcessExecutionTraceEventsViewProps {
  trace: ProcessExecutionTraceDto;
  items: ProcessExecutionTimelineItem[];
}

export function ProcessExecutionTraceEventsView(props: ProcessExecutionTraceEventsViewProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <header className="mx-auto w-full max-w-5xl flex-none px-4 pt-4 sm:px-6 sm:pt-5 pb-2">
        <Link to="/admin/process-execution-traces" className="text-sm text-slate-600 underline">
          Back to execution traces
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">Trace events</h1>
        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <TraceDetail label="Process" value={`/${props.trace.processName}`} />
          <TraceDetail label="Execution ID" value={props.trace.executionId} />
          <TraceDetail label="Status" value={strProcessExecutionTraceStatus(props.trace.status)} />
          <TraceDetail label="Trigger" value={strProcessExecutionTrigger(props.trace.trigger)} />
          <TraceDetail label="Started by" value={`@${props.trace.startedBy}`} />
          <TraceDetail label="Updated" value={formatDate(props.trace.updatedAt)} />
          <TraceDetail label="Completed" value={props.trace.completedAt === null ? '—' : formatDate(props.trace.completedAt)} />
        </dl>
        {props.trace.error !== null ? (
          <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
            <h2 className="text-xs font-medium uppercase tracking-wide text-red-700">Error</h2>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-5 text-red-800">
              {props.trace.error}
            </pre>
          </div>
        ) : null}
      </header>

      <div className="min-h-0 flex-1">
        <ProcessExecutionTimelineView
          items={props.items}
          scrollContainerRef={scrollContainerRef}
          startForm={null}
          renderOutputForm={() => null}
        />
      </div>
    </div>
  );
}

function TraceDetail(props: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{props.label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-900">{props.value}</dd>
    </div>
  );
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}
