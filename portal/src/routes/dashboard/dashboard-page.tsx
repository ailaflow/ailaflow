import { useLoader } from '@aibindkit/react';
import { useApiClient } from '../../auth/auth-context';
import { DashboardListView } from '../../views/dashboard/dashboard-list-view';
import { DashboardPanelView } from '../../views/dashboard/dashboard-panel-view';
import { DashboardRowView, DashboardView } from '../../views/dashboard/dashboard-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { Portal } from '../common/portal';

const PANEL_ITEM_LIMIT = 6;
const PANEL_PAGE_SIZE = PANEL_ITEM_LIMIT + 1;

export function DashboardPage() {
  const apiClient = useApiClient();
  const { data, isLoading, error } = useLoader(
    async abortSignal => {
      const [tasks, processes, notifications] = await Promise.all([
        apiClient.myTask.getMyTasks(abortSignal, { onlyOpen: true, page: 1, pageSize: PANEL_PAGE_SIZE }),
        apiClient.myProcess.getMyProcesses(abortSignal, { page: 1, pageSize: PANEL_PAGE_SIZE }),
        apiClient.myNotification.getMyNotifications(abortSignal, { page: 1, pageSize: PANEL_PAGE_SIZE })
      ]);

      return { tasks, processes, notifications };
    },
    [apiClient]
  );

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
      <DashboardView>
        <DashboardRowView>
          <DashboardPanelView
            title="My Tasks"
            action={data.tasks.tasks.length > PANEL_ITEM_LIMIT ? { label: 'View all', href: '/my-tasks' } : undefined}
          >
            <DashboardListView
              items={data.tasks.tasks.slice(0, PANEL_ITEM_LIMIT)}
              emptyMessage="You have no open tasks."
              getItemKey={task => task.id}
              getItemTitle={task => task.title}
              getItemDescription={task => (task.isOutdated ? 'Outdated' : 'Open')}
              getItemBadge={() => 'T'}
            />
          </DashboardPanelView>

          <DashboardPanelView
            title="My Processes"
            action={data.processes.processes.length > PANEL_ITEM_LIMIT ? { label: 'View all', href: '/my-processes' } : undefined}
          >
            <DashboardListView
              items={data.processes.processes.slice(0, PANEL_ITEM_LIMIT)}
              emptyMessage="No processes are available."
              getItemKey={process => process.name}
              getItemTitle={process => process.name}
              getItemDescription={process => process.description}
              getItemBadge={() => 'P'}
            />
          </DashboardPanelView>

          <DashboardPanelView
            title="My Notifications"
            action={
              data.notifications.notifications.length > PANEL_ITEM_LIMIT ? { label: 'View all', href: '/my-notifications' } : undefined
            }
          >
            <DashboardListView
              items={data.notifications.notifications.slice(0, PANEL_ITEM_LIMIT)}
              emptyMessage="You have no notifications."
              getItemKey={notification => notification.id}
              getItemTitle={notification => notification.message}
              getItemMeta={notification => formatDate(notification.createdAt)}
              getItemBadge={() => 'N'}
            />
          </DashboardPanelView>
        </DashboardRowView>
      </DashboardView>
    </Portal>
  );
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}
