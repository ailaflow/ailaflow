import { useLoader } from '@aibindkit/react';
import { ProcessDto, ProcessLogLevel, type ProcessExecutionTraceEventDto } from '@ailaflow/shared';
import { useParams } from 'react-router';
import { useApiClient } from '../../auth/auth-context';
import {
  CurrentStepProcessExecutionTimelineItem,
  LogProcessExecutionTimelineItem,
  type ProcessExecutionTimelineItem
} from '../../views/common/process-execution-timeline-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { ProcessExecutionTraceEventsView } from '../../views/process-execution-trace-events/process-execution-trace-events-view';
import { DefinitionWalker } from 'sequential-workflow-model';
import { useMemo } from 'react';

export function ProcessExecutionTraceEventsPage() {
  const { executionId } = useParams();
  if (!executionId) {
    throw new Error('Execution ID is required');
  }
  const apiClient = useApiClient();
  const { data, isLoading, error } = useLoader(
    async signal => {
      const [trace, events] = await Promise.all([
        apiClient.processExecution.getTrace(signal, executionId),
        apiClient.processExecution.getTraceEvents(signal, executionId)
      ]);
      const process = await apiClient.process.getProcess(signal, trace.trace.processName);
      return {
        trace: trace.trace,
        events: events.events,
        process: process.process
      };
    },
    [apiClient, executionId]
  );
  const walker = useMemo(() => new DefinitionWalker(), []);

  if (isLoading) {
    return <PortalLoadingView />;
  }
  if (error) {
    return <PortalErrorView error={error} />;
  }

  return <ProcessExecutionTraceEventsView trace={data.trace} items={data.events.map(e => toTimelineItem(e, data.process, walker))} />;
}

function toTimelineItem(event: ProcessExecutionTraceEventDto, process: ProcessDto, walker: DefinitionWalker): ProcessExecutionTimelineItem {
  if (event.stepChange) {
    const step = walker.findById(process.definition, event.stepChange.stepId);
    return new CurrentStepProcessExecutionTimelineItem(event.createdAt, event.stepChange.stepId, step?.name ?? event.stepChange.stepId);
  }
  if (event.log) {
    return new LogProcessExecutionTimelineItem(event.log);
  }
  if (event.pause) {
    return new LogProcessExecutionTimelineItem([event.createdAt, ProcessLogLevel.INFO, `Process paused at step ${event.pause.stepId}`]);
  }
  throw new Error('Unsupported trace event type');
}
