import { useLoader } from '@aibindkit/react';
import { ProcessExecutionTraceEventType, ProcessLogLevel, type ProcessExecutionTraceEventDto } from '@ailaflow/shared';
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

export function ProcessExecutionTraceEventsPage() {
  const { executionId } = useParams();
  if (!executionId) {
    throw new Error('Execution ID is required');
  }
  const apiClient = useApiClient();
  const { data, isLoading, error } = useLoader(
    signal =>
      Promise.all([
        apiClient.processExecution.getTrace(signal, executionId),
        apiClient.processExecution.getTraceEvents(signal, executionId)
      ]),
    [apiClient, executionId]
  );

  if (isLoading) {
    return <PortalLoadingView />;
  }
  if (error) {
    return <PortalErrorView error={error} />;
  }

  const [traceResponse, eventsResponse] = data;
  return <ProcessExecutionTraceEventsView trace={traceResponse.trace} items={eventsResponse.events.map(toTimelineItem)} />;
}

function toTimelineItem(event: ProcessExecutionTraceEventDto): ProcessExecutionTimelineItem {
  if (event.stepChange) {
    return new CurrentStepProcessExecutionTimelineItem(event.createdAt, event.stepChange.stepId, event.stepChange.stepId);
  }
  if (event.log) {
    return new LogProcessExecutionTimelineItem(event.log);
  }
  if (event.pause) {
    return new LogProcessExecutionTimelineItem([event.createdAt, ProcessLogLevel.INFO, `Process paused at step ${event.pause.stepId}`]);
  }
  throw new Error('Unsupported trace event type');
}
