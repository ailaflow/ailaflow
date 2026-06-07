import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '../../core/use-loader';
import { AdminPortal, AdminPortalError, AdminPortalLoading } from '../common/admin-portal';
import { ResourceListView } from '../../views/resource-list/resource-list-view';
import { PencilIcon } from '../../views/common/svg-icons';

export function ContainerList() {
  const apiClient = useApiClient();
  const { data, isLoading, error } = useLoader(abortSignal => apiClient.container.getContainers(abortSignal), [apiClient]);

  if (isLoading) {
    return <AdminPortalLoading />;
  }
  if (error) {
    return <AdminPortalError error={error} />;
  }

  return (
    <AdminPortal>
      <ResourceListView
        title="Containers"
        createNew={{
          label: 'Create new',
          to: '/admin/create-container'
        }}
        columns={[
          {
            id: 'name',
            title: 'Name',
            width: '24%',
            leadingBadge: '+',
            getValue: container => container.name
          },
          {
            id: 'isEnabled',
            title: 'Status',
            width: '14%',
            getValue: container => (container.isEnabled ? 'Enabled' : 'Disabled')
          },
          {
            id: 'description',
            title: 'Description',
            width: '44%',
            getValue: container => container.description
          }
        ]}
        rows={data.containers}
        getRowKey={container => container.name}
        emptyMessage="No containers found."
        actions={[
          {
            label: <PencilIcon className="h-4 w-4" />,
            ariaLabel: 'Edit container',
            getTo: container => `/admin/containers/${encodeURIComponent(container.name)}`
          }
        ]}
      />
    </AdminPortal>
  );
}
