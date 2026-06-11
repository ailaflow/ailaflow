import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '../../core/use-loader';
import { ResourceListView } from '../../views/resource-list/resource-list-view';
import { PencilIcon } from '../../views/common/svg-icons';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';

export function SandboxList() {
  const apiClient = useApiClient();
  const { data, isLoading, error } = useLoader(abortSignal => apiClient.sandbox.getSandboxes(abortSignal), [apiClient]);

  if (isLoading) {
    return <PortalLoadingView />;
  }
  if (error) {
    return <PortalErrorView error={error} />;
  }

  return (
    <ResourceListView
      title="Sandboxes"
      createNew={{
        label: 'Create new',
        to: '/admin/create-sandbox'
      }}
      columns={[
        {
          id: 'name',
          title: 'Name',
          width: '24%',
          leadingBadge: '+',
          getValue: sandbox => sandbox.name
        },
        {
          id: 'isEnabled',
          title: 'Status',
          width: '14%',
          getValue: sandbox => (sandbox.isEnabled ? 'Enabled' : 'Disabled')
        },
        {
          id: 'description',
          title: 'Description',
          width: '44%',
          getValue: sandbox => sandbox.description
        }
      ]}
      rows={data.sandboxes}
      getRowKey={sandbox => sandbox.name}
      emptyMessage="No sandboxes found."
      actions={[
        {
          label: <PencilIcon className="h-4 w-4" />,
          ariaLabel: 'Edit sandbox',
          getTo: sandbox => `/admin/sandboxes/${encodeURIComponent(sandbox.name)}`
        }
      ]}
    />
  );
}
