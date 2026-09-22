import { useLoader } from '@aibindkit/react';
import { ProcessDisplay } from '@ailaflow/shared';
import { useState } from 'react';
import { useApiClient } from '../../auth/auth-context';
import { DashboardListView } from '../../views/dashboard/dashboard-list-view';
import { DashboardPanelView } from '../../views/dashboard/dashboard-panel-view';
import { DashboardView } from '../../views/dashboard/dashboard-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { ProcessIconGridView } from '../../views/common/process-icon-grid-view';
import { MyChat } from '../common/my-chat/my-chat';
import { MyProcessStartFormPopup } from '../common/popups/my-process-start-form-popup';
import { MyTaskFormPopup } from '../common/popups/my-task-form-popup';
import { Portal } from '../common/portal';

const PANEL_ITEM_LIMIT = 6;
const PANEL_PAGE_SIZE = PANEL_ITEM_LIMIT + 1;

export function DashboardPage() {
  const apiClient = useApiClient();
  const [startedProcessName, setStartedProcessName] = useState<string | null>(null);
  const [openedTaskId, setOpenedTaskId] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const { data, isLoading, error } = useLoader(
    async signal => {
      const [tasks, processes, notifications] = await Promise.all([
        apiClient.myTask.getMyTasks(signal, { onlyOpen: true, page: 1, pageSize: PANEL_PAGE_SIZE }),
        apiClient.myProcess.getMyProcesses(signal, {
          page: 1,
          pageSize: PANEL_PAGE_SIZE,
          displayAtLeast: ProcessDisplay.FEATURED
        }),
        apiClient.myNotification.getMyNotifications(signal, { page: 1, pageSize: PANEL_PAGE_SIZE })
      ]);

      return { tasks, processes, notifications };
    },
    [apiClient, reloadToken]
  );

  function handleProcessEnded(candidateTaskIds?: string[]): void {
    setStartedProcessName(null);

    const candidateTaskId = candidateTaskIds?.[0];
    if (candidateTaskId) {
      setOpenedTaskId(candidateTaskId);
    }
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
              createdAt: task.createdAt,
              ariaLabel: `Open task ${task.title}`,
              onClick: () => setOpenedTaskId(task.id)
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
              createdAt: notification.createdAt
            }))}
            emptyMessage="You have no notifications."
          />
        </DashboardPanelView>
        <DashboardPanelView
          title="Featured Processes"
          variant="dashboard"
          scrollable
          action={data.processes.processes.length > PANEL_ITEM_LIMIT ? { label: 'View all', href: '/my-processes' } : undefined}
        >
          <ProcessIconGridView
            variant="dashboard"
            items={data.processes.processes.slice(0, PANEL_ITEM_LIMIT).map(process => ({
              name: process.name,
              description: process.description,
              url: `/my-processes/${encodeURIComponent(process.name)}`,
              onClick: () => setStartedProcessName(process.name)
            }))}
            emptyMessage="No processes are available."
          />
        </DashboardPanelView>
      </DashboardView>
      {startedProcessName ? (
        <MyProcessStartFormPopup
          args={{ processName: startedProcessName }}
          onEnded={handleProcessEnded}
          onClose={() => setStartedProcessName(null)}
        />
      ) : null}
      {openedTaskId ? (
        <MyTaskFormPopup
          args={{ taskId: openedTaskId }}
          onSubmitted={() => setReloadToken(current => current + 1)}
          onClose={() => setOpenedTaskId(null)}
        />
      ) : null}
    </Portal>
  );
}
