import { useLoader } from '@aibindkit/react';
import { useSearchParams } from 'react-router';
import { useApiClient } from '../../auth/auth-context';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { ResourceListView } from '../../views/resource-list/resource-list-view';
import { Portal } from '../common/portal';

const PAGE_SIZE = 20;

export function MyNotificationsPage() {
  const apiClient = useApiClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? 1);
  const { data, isLoading, error } = useLoader(
    abortSignal => apiClient.myNotification.getMyNotifications(abortSignal, { page, pageSize: PAGE_SIZE }),
    [apiClient, page]
  );

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
        title="My Notifications"
        columns={[
          {
            id: 'message',
            title: 'Message',
            width: '72%',
            leadingBadge: 'N',
            getValue: notification => notification.message
          },
          {
            id: 'createdAt',
            title: 'Received',
            width: '28%',
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
      />
    </Portal>
  );
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}
