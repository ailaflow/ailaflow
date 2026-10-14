import { useLoader } from '@aibindkit/react';
import { DEFAULT_CHANNEL_NAME, MyNotificationDto, ProcessDisplay, type MyProcessLiteDto } from '@ailaflow/shared';
import { useEffect, useState } from 'react';
import { useAuthState } from '../../auth/auth-context';
import { DashboardListView } from '../../views/dashboard/dashboard-list-view';
import { DashboardPanelView } from '../../views/dashboard/dashboard-panel-view';
import { DashboardView } from '../../views/dashboard/dashboard-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { ProcessIconGridView } from '../../views/common/process-icon-grid-view';
import { SvgIcon } from '../../views/common/svg-icons';
import { MyChat } from '../common/my-chat/my-chat';
import { MyProcessFormPopup } from '../common/popups/my-process-form-popup';
import { MyTaskFormPopup } from '../common/popups/my-task-form-popup';
import { FormSubmittedAlertPopup } from '../common/popups/form-submitted-alert-popup';

const PANEL_ITEM_LIMIT = 6;
const PANEL_PAGE_SIZE = PANEL_ITEM_LIMIT + 1;

export function DashboardPage() {
  const { apiClient, session } = useAuthState();
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
  const [notifications, setNotifications] = useState<MyNotificationDto[]>([]);

  useEffect(() => setNotifications(data?.notifications?.notifications ?? []), [data]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const abortController = new AbortController();

    async function listen() {
      try {
        await apiClient.myNotification.listenMyNotifications(abortController.signal, {
          onMessage(update) {
            setNotifications(c => [update.notification, ...c]);
          },
          onClose() {}
        });
      } catch (e) {
        if (!abortController.signal.aborted) {
          console.error(`Failed to listen for notifications: ${(e as Error)?.message ?? e}`);
        }
      }
    }

    void listen();
    return () => abortController.abort();
  }, [apiClient, session]);

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
        <DashboardPanelView title="My Tasks" icon="timer" variant="dashboard" scrollable action={{ label: 'View all', href: '/my-tasks' }}>
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
          icon="notification"
          variant="dashboard"
          scrollable
          action={{ label: 'View all', href: '/my-notifications' }}
        >
          <DashboardListView
            items={notifications.slice(0, PANEL_ITEM_LIMIT).map(notification => ({
              key: notification.id,
              title: notification.message,
              createdAt: notification.createdAt
            }))}
            emptyMessage="You have no notifications."
          />
        </DashboardPanelView>
        <DashboardPanelView
          title="Featured Processes"
          icon="processes"
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
        <MyProcessFormPopup
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
          onClose={() => setOpenedTaskId(null)}
        />
      )}
      {formSubmitted && <FormSubmittedAlertPopup onClose={() => setFormSubmitted(false)} />}
    </>
  );
}
