import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '@aibindkit/react';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { ResourceListView } from '../../views/resource-list/resource-list-view';
import { Portal } from '../common/portal';

export function MyProcessList() {
  const apiClient = useApiClient();
  const { data, isLoading, error } = useLoader(abortSignal => apiClient.myProcess.getMyProcesses(abortSignal), [apiClient]);

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
      />
    </Portal>
  );
}
