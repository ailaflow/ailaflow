import { useLoader } from '@aibindkit/react';
import { useApiClient } from '../../auth/auth-context';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { ResourceListView } from '../../views/resource-list/resource-list-view';
import { Portal } from '../common/portal';

export function MyTasksPage() {
  const apiClient = useApiClient();
  const { data, isLoading, error } = useLoader(abortSignal => apiClient.myTask.getMyTasks(abortSignal), [apiClient]);

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
        columns={[
          {
            id: 'title',
            title: 'Title',
            width: '52%',
            leadingBadge: 'T',
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
      />
    </Portal>
  );
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}
