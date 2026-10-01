import { useLoader } from '@aibindkit/react';
import { useSearchParams } from 'react-router';
import { useApiClient } from '../../auth/auth-context';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { ResourceListView } from '../../views/resource-list/resource-list-view';
import { ResourceHeaderSwitchView } from '../../views/resource-list/resource-header-switch-view';
import { SvgIcon } from '../../views/common/svg-icons';

const PAGE_SIZE = 20;

export function MyTasksPage() {
  const apiClient = useApiClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const onlyOpen = searchParams.get('only-open') !== '0';
  const page = Number(searchParams.get('page') ?? 1);
  const { data, isLoading, error } = useLoader(
    signal => apiClient.myTask.getMyTasks(signal, { onlyOpen, page, pageSize: PAGE_SIZE }),
    [apiClient, onlyOpen, page]
  );

  function changeOnlyOpen(value: 'open' | 'all'): void {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      next.set('only-open', value === 'open' ? '1' : '0');
      next.set('page', '1');
      return next;
    });
  }

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
    <>
      <ResourceListView
        title="My Tasks"
        headerActions={
          <ResourceHeaderSwitchView
            ariaLabel="Filter tasks by status"
            value={onlyOpen ? 'open' : 'all'}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'all', label: 'All' }
            ]}
            onChange={changeOnlyOpen}
          />
        }
        columns={[
          {
            id: 'title',
            title: 'Title',
            width: '40%',
            getLeadingVisual: task =>
              !task.deadline || task.completedAt ? null : <SvgIcon name="timer" className="h-5 w-5 shrink-0 text-slate-500" />,
            getValue: task => task.title
          },
          {
            id: 'status',
            title: 'Status',
            width: '16%',
            getValue: task => (task.completedAt === undefined ? 'Open' : 'Completed')
          },
          {
            id: 'deadline',
            title: 'Deadline',
            width: '22%',
            getValue: task => (task.deadline === undefined ? '' : formatDate(task.deadline))
          },
          {
            id: 'completedAt',
            title: 'Completed',
            width: '22%',
            getValue: task => (task.completedAt === undefined ? '' : formatDate(task.completedAt))
          }
        ]}
        rows={data.tasks}
        getRowKey={task => task.id}
        emptyMessage="No tasks found."
        primaryAction={{
          icon: <SvgIcon name="eyeOpen" className="h-4 w-4" />,
          ariaLabel: 'Open task',
          isVisible: task => task.completedAt === undefined,
          getTo: task => `/my-tasks/${task.id}`
        }}
        pagination={{
          page: data.page,
          pageSize: data.pageSize,
          totalCount: data.totalCount,
          onPageChange: changePage
        }}
      />
    </>
  );
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}
