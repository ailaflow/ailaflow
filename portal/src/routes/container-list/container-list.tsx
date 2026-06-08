import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '../../core/use-loader';
import { ResourceListView } from '../../views/resource-list/resource-list-view';
import { PencilIcon } from '../../views/common/svg-icons';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';

export function ContainerList() {
  const apiClient = useApiClient();
  const { data, isLoading, error } = useLoader(abortSignal => apiClient.container.getContainers(abortSignal), [apiClient]);

  if (isLoading) {
    return <PortalLoadingView />;
  }
  if (error) {
    return <PortalErrorView error={error} />;
  }

  return (
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
  );
}
