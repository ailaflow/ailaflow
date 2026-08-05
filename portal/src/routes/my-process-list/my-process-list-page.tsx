import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '@aibindkit/react';
import { useSearchParams } from 'react-router';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { ResourceListView } from '../../views/resource-list/resource-list-view';
import { Portal } from '../common/portal';

const PAGE_SIZE = 20;

export function MyProcessListPage() {
  const apiClient = useApiClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? 1);
  const { data, isLoading, error } = useLoader(
    abortSignal => apiClient.myProcess.getMyProcesses(abortSignal, { page, pageSize: PAGE_SIZE }),
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
        title="My Processes"
        columns={[
          {
            id: 'name',
            title: 'Name',
            width: '28%',
            leadingBadge: '/',
            getValue: process => process.name
          },
          {
            id: 'description',
            title: 'Description',
            width: '52%',
            getValue: process => process.description
          }
        ]}
        rows={data.processes}
        getRowKey={process => process.name}
        emptyMessage="No processes found."
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
