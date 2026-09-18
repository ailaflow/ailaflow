import { useLoader } from '@aibindkit/react';
import { useState } from 'react';
import { useApiClient } from '../../auth/auth-context';
import { DashboardListView } from '../../views/dashboard/dashboard-list-view';
import { DashboardPanelView } from '../../views/dashboard/dashboard-panel-view';
import { DashboardView } from '../../views/dashboard/dashboard-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { MyChat } from '../common/my-chat/my-chat';
import { MyProcessStartFormPopup } from '../common/popups/my-process-start-form-popup';
import { Portal } from '../common/portal';

const PANEL_ITEM_LIMIT = 6;
const PANEL_PAGE_SIZE = PANEL_ITEM_LIMIT + 1;

export function DashboardPage() {
  const apiClient = useApiClient();
  const [startedProcessName, setStartedProcessName] = useState<string | null>(null);
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
      <DashboardView chat={<MyChat sessionKey="user:default" />}>
        <DashboardPanelView
          title="My Tasks"
          variant="dashboard"
          scrollable
          action={data.tasks.tasks.length > PANEL_ITEM_LIMIT ? { label: 'View all', href: '/my-tasks' } : undefined}
        >
          <DashboardListView
            items={data.tasks.tasks.slice(0, PANEL_ITEM_LIMIT).map(task => ({
              key: task.id,
              title: task.title,
              description: task.isOutdated ? 'Outdated' : 'Open',
              badge: 'T'
            }))}
            emptyMessage="You have no open tasks."
          />
        </DashboardPanelView>

        <DashboardPanelView
          title="My Notifications"
          variant="dashboard"
          scrollable
          action={data.notifications.notifications.length > PANEL_ITEM_LIMIT ? { label: 'View all', href: '/my-notifications' } : undefined}
        >
          <DashboardListView
            items={data.notifications.notifications.slice(0, PANEL_ITEM_LIMIT).map(notification => ({
              key: notification.id,
              title: notification.message,
              meta: formatDate(notification.createdAt),
              badge: 'N'
            }))}
            emptyMessage="You have no notifications."
          />
        </DashboardPanelView>
        <DashboardPanelView
          title="My Processes"
          variant="dashboard"
          scrollable
          action={data.processes.processes.length > PANEL_ITEM_LIMIT ? { label: 'View all', href: '/my-processes' } : undefined}
        >
          <DashboardListView
            items={data.processes.processes.slice(0, PANEL_ITEM_LIMIT).map(process => ({
              key: process.name,
              title: process.name,
              description: process.description,
              badge: 'P',
              action: {
                label: 'Start',
                ariaLabel: `Start process ${process.name}`,
                onClick: () => setStartedProcessName(process.name)
              }
            }))}
            emptyMessage="No processes are available."
          />
        </DashboardPanelView>
      </DashboardView>
      {startedProcessName ? (
        <MyProcessStartFormPopup args={{ processName: startedProcessName }} onClose={() => setStartedProcessName(null)} />
      ) : null}
    </Portal>
  );
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString();
}
