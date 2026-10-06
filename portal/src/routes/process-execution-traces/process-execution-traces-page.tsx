import { useLoader } from '@aibindkit/react';
import { useSearchParams } from 'react-router';
import { useApiClient } from '../../auth/auth-context';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { ResourceListView } from '../../views/resource-list/resource-list-view';
import { SvgIcon } from '../../views/common/svg-icons';
import { strProcessExecutionTraceStatus, strProcessExecutionTrigger } from '@ailaflow/shared';

const PAGE_SIZE = 20;

export function ProcessExecutionTracesPage() {
  const apiClient = useApiClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? 1);
  const processName = searchParams.get('process') || undefined;
  const { data, isLoading, error } = useLoader(
    signal => apiClient.processExecution.getTraces(signal, { page, pageSize: PAGE_SIZE, processName }),
    [apiClient, page, processName]
  );

  function changePage(value: number): void {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      next.set('page', String(value));
      return next;
    });
  }

  if (isLoading) {
    return <PortalLoadingView />;
  }
  if (error) {
    return <PortalErrorView error={error} />;
  }

  return (
    <ResourceListView
      title={processName ? `Traces for /${processName}` : 'Traces'}
      columns={[
        {
          id: 'name',
          title: 'Process',
          width: '16%',
          getValue: trace => `/${trace.processName}`
        },
        {
          id: 'executionId',
          title: 'Execution ID',
          width: '24%',
          getValue: trace => trace.executionId.substring(0, 8)
        },
        {
          id: 'status',
          title: 'Status',
          width: '10%',
          getValue: trace => strProcessExecutionTraceStatus(trace.status)
        },
        {
          id: 'trigger',
          title: 'Trigger',
          width: '12%',
          getValue: trace => strProcessExecutionTrigger(trace.trigger)
        },
        {
          id: 'startedBy',
          title: 'Started by',
          width: '12%',
          getValue: trace => `@${trace.startedBy}`
        },
        {
          id: 'updatedAt',
          title: 'Updated',
          width: '28%',
          getValue: trace => formatDate(trace.updatedAt)
        }
      ]}
      rows={data.traces}
      getRowKey={trace => trace.executionId}
      emptyMessage="No execution traces found."
      primaryAction={{
        icon: <SvgIcon name="eyeOpen" className="h-4 w-4" />,
        ariaLabel: 'View trace events',
        getTo: trace => `/admin/process-execution-traces/${trace.executionId}`
      }}
      pagination={{
        page: data.page,
        pageSize: data.pageSize,
        totalCount: data.totalCount,
        onPageChange: changePage
      }}
    />
  );
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}
