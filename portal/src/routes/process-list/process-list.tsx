import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '../../core/use-loader';
import { AdminPortal, AdminPortalError, AdminPortalLoading } from '../common/admin-portal';
import { ResourceListView } from '../../views/resource-list/resource-list-view';

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
      <ResourceListView
        title="Processes"
        createNew={{
          label: 'Create new',
          to: '/admin/create-process'
        }}
        columns={[
          {
            id: 'name',
            title: 'Name',
            width: '22%',
            leadingBadge: '/',
            getValue: process => process.name
          },
          {
            id: 'description',
            title: 'Description',
            width: '34%',
            getValue: process => process.description
          },
          {
            id: 'userList',
            title: 'User list',
            width: '16%',
            getValue: process => process.userList
          }
        ]}
        rows={data.processes}
        getRowKey={process => process.id}
        emptyMessage="No processes found."
        actions={[
          {
            label: 'Edit',
            getTo: process => `/admin/processes/${process.id}`
          },
          {
            label: 'Test',
            getTo: process => `/admin/processes/${process.id}/test`
          }
        ]}
      />
    </AdminPortal>
  );
}
