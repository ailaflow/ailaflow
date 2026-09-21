import { useLoader } from '@aibindkit/react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useApiClient } from '../../auth/auth-context';
import { SvgIcon } from '../../views/common/svg-icons';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { ResourceListView } from '../../views/resource-list/resource-list-view';
import { Portal } from '../common/portal';

const PAGE_SIZE = 20;

export function MyNotificationsPage() {
  const apiClient = useApiClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reloadToken, setReloadToken] = useState(0);
  const page = Number(searchParams.get('page') ?? 1);
  const { data, isLoading, error } = useLoader(
    abortSignal => apiClient.myNotification.getMyNotifications(abortSignal, { page, pageSize: PAGE_SIZE }),
    [apiClient, page, reloadToken]
  );

  function changePage(value: number): void {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      next.set('page', String(value));
      return next;
    });
  }

  async function deleteNotification(id: string): Promise<void> {
    try {
      await apiClient.myNotification.deleteMyNotification(AbortSignal.timeout(5_000), id);
      changePage(1);
      setReloadToken(current => current + 1);
    } catch (e) {
      window.alert(`Failed to delete notification: ${e instanceof Error ? e.message : String(e)}`);
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
      <ResourceListView
        title="My Notifications"
        columns={[
          {
            id: 'message',
            title: 'Message',
            width: '58%',
            wrap: true,
            getValue: notification => notification.message
          },
          {
            id: 'createdAt',
            title: 'Received',
            width: '24%',
            getValue: notification => formatDate(notification.createdAt)
          }
        ]}
        rows={data.notifications}
        getRowKey={notification => notification.id}
        emptyMessage="No notifications found."
        pagination={{
          page: data.page,
          pageSize: data.pageSize,
          totalCount: data.totalCount,
          onPageChange: changePage
        }}
        actions={[
          {
            label: <SvgIcon name="x" className="h-4 w-4" />,
            ariaLabel: notification => `Delete notification ${notification.id}`,
            danger: true,
            onClick: notification => deleteNotification(notification.id)
          }
        ]}
      />
    </Portal>
  );
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}
