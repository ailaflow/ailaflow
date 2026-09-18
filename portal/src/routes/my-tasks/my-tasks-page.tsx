import { useLoader } from '@aibindkit/react';
import { useSearchParams } from 'react-router';
import { useApiClient } from '../../auth/auth-context';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { ResourceListView } from '../../views/resource-list/resource-list-view';
import { ResourceHeaderSwitchView } from '../../views/resource-list/resource-header-switch-view';
import { Portal } from '../common/portal';

const PAGE_SIZE = 20;

export function MyTasksPage() {
  const apiClient = useApiClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const onlyOpen = searchParams.get('only-open') !== '0';
  const page = Number(searchParams.get('page') ?? 1);
  const { data, isLoading, error } = useLoader(
    abortSignal => apiClient.myTask.getMyTasks(abortSignal, { onlyOpen, page, pageSize: PAGE_SIZE }),
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
    return (
      <Portal>
        <PortalLoadingView />
      </Portal>
    );
  }
  if (error) {
    return (
      <Portal>
        <PortalErrorView error={error} />
      </Portal>
    );
  }

  return (
    <Portal>
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
            width: '52%',
            getValue: task => task.title
          },
          {
            id: 'status',
            title: 'Status',
            width: '24%',
            getValue: task => {
              if (task.completedAt !== undefined) {
                return 'Completed';
              }
              return task.isOutdated ? 'Outdated' : 'Open';
            }
          },
          {
            id: 'completedAt',
            title: 'Completed',
            width: '24%',
            getValue: task => (task.completedAt === undefined ? '' : formatDate(task.completedAt))
          }
        ]}
        rows={data.tasks}
        getRowKey={task => task.id}
        emptyMessage="No tasks found."
        actions={[
          {
            label: 'Open',
            ariaLabel: task => `Open task ${task.title}`,
            isVisible: task => task.completedAt === undefined,
            getTo: task => `/my-tasks/${encodeURIComponent(task.id)}`
          }
        ]}
        pagination={{
          page: data.page,
          pageSize: data.pageSize,
          totalCount: data.totalCount,
          onPageChange: changePage
        }}
      />
    </Portal>
  );
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}
