import { useLoader } from '@aibindkit/react';
import { DEFAULT_CHANNEL_NAME, ProcessDisplay, type MyProcessLiteDto } from '@ailaflow/shared';
import { useState } from 'react';
import { useApiClient } from '../../auth/auth-context';
import { DashboardListView } from '../../views/dashboard/dashboard-list-view';
import { DashboardPanelView } from '../../views/dashboard/dashboard-panel-view';
import { DashboardView } from '../../views/dashboard/dashboard-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { ProcessIconGridView } from '../../views/common/process-icon-grid-view';
import { SvgIcon } from '../../views/common/svg-icons';
import { MyChat } from '../common/my-chat/my-chat';
import { MyProcessStartFormPopup } from '../common/popups/my-process-start-form-popup';
import { MyTaskFormPopup } from '../common/popups/my-task-form-popup';
import { FormSubmittedAlertPopup } from '../common/popups/form-submitted-alert-popup';

const PANEL_ITEM_LIMIT = 6;
const PANEL_PAGE_SIZE = PANEL_ITEM_LIMIT + 1;

export function DashboardPage() {
  const apiClient = useApiClient();
  const [startedProcess, setStartedProcess] = useState<MyProcessLiteDto | null>(null);
  const [openedTaskId, setOpenedTaskId] = useState<string | null>(null);
  const [formSubmitted, setFormSubmitted] = useState(false);
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
    setStartedProcess(null);

    const candidateTaskId = candidateTaskIds?.[0];
    if (candidateTaskId) {
      setOpenedTaskId(candidateTaskId);
    } else {
      setFormSubmitted(true);
    }
  }

  if (isLoading) {
    return <PortalLoadingView />;
  }
  if (error) {
    return <PortalErrorView error={error} />;
  }

  return (
    <>
      <DashboardView chat={<MyChat sessionKey={`user:${DEFAULT_CHANNEL_NAME}`} />}>
        <DashboardPanelView title="My Tasks" variant="dashboard" scrollable action={{ label: 'View all', href: '/my-tasks' }}>
          <DashboardListView
            items={data.tasks.tasks.slice(0, PANEL_ITEM_LIMIT).map(task => ({
              key: task.id,
              title: task.title,
              deadline: task.deadline,
              createdAt: task.createdAt,
              ariaLabel: `Open task ${task.title}`,
              onClick: () => setOpenedTaskId(task.id)
            }))}
            getLeadingVisual={task =>
              task.deadline === undefined ? null : <SvgIcon name="timer" className="h-5 w-5 shrink-0 text-slate-500" />
            }
            emptyMessage="You have no open tasks."
          />
        </DashboardPanelView>

        <DashboardPanelView
          title="My Notifications"
          variant="dashboard"
          scrollable
          action={{ label: 'View all', href: '/my-notifications' }}
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
              icon: process.icon,
              description: process.description,
              url: `/my-processes/${process.name}`,
              onClick: () => setStartedProcess(process)
            }))}
            emptyMessage="No processes are available."
          />
        </DashboardPanelView>
      </DashboardView>
      {startedProcess && (
        <MyProcessStartFormPopup
          args={{ processName: startedProcess.name }}
          icon={startedProcess.icon}
          onEnded={handleProcessEnded}
          onClose={() => setStartedProcess(null)}
        />
      )}
      {openedTaskId && (
        <MyTaskFormPopup
          args={{ taskId: openedTaskId }}
          onSubmitted={() => {
            setReloadToken(current => current + 1);
            setFormSubmitted(true);
          }}
          onClose={() => {
            setOpenedTaskId(null);
          }}
        />
      )}
      {formSubmitted && <FormSubmittedAlertPopup onClose={() => setFormSubmitted(false)} />}
    </>
  );
}
