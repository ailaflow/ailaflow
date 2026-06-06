import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '../../core/use-loader';
import { AdminPortal, AdminPortalError, AdminPortalLoading } from '../common/admin-portal';
import { ProcessListView } from '../../views/process-list/process-list-view';

export function ProcessList() {
  const apiClient = useApiClient();
  const { data, isLoading, error } = useLoader(abortSignal => apiClient.process.getProcesses(abortSignal), [apiClient]);

  if (isLoading) {
    return <AdminPortalLoading />;
  }
  if (error) {
    return <AdminPortalError error={error} />;
  }

  return (
    <AdminPortal>
      <ProcessListView processes={data.processes} />
    </AdminPortal>
  );
}
