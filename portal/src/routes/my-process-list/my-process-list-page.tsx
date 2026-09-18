import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '@aibindkit/react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { ProcessListView } from '../../views/process-list-view/process-list-view';
import { MyProcessStartFormPopup } from '../common/popups/my-process-start-form-popup';
import { Portal } from '../common/portal';

const PAGE_SIZE = 20;

export function MyProcessListPage() {
  const apiClient = useApiClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [startedProcessName, setStartedProcessName] = useState<string | null>(null);
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
      <ProcessListView
        title="My Processes"
        items={data.processes.map(process => ({
          name: process.name,
          description: process.description,
          onClick: () => setStartedProcessName(process.name)
        }))}
        emptyMessage="No processes found."
        pagination={{
          page: data.page,
          pageSize: data.pageSize,
          totalCount: data.totalCount,
          onPageChange: changePage
        }}
      />
      {startedProcessName ? (
        <MyProcessStartFormPopup args={{ processName: startedProcessName }} onClose={() => setStartedProcessName(null)} />
      ) : null}
    </Portal>
  );
}
