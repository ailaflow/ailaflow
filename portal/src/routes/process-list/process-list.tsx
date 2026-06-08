import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '../../core/use-loader';
import { ResourceListView } from '../../views/resource-list/resource-list-view';
import { PencilIcon } from '../../views/common/svg-icons';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';

export function ProcessList() {
  const apiClient = useApiClient();
  const { data, isLoading, error } = useLoader(abortSignal => apiClient.process.getProcesses(abortSignal), [apiClient]);

  if (isLoading) {
    return <PortalLoadingView />;
  }
  if (error) {
    return <PortalErrorView error={error} />;
  }

  return (
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
          label: <PencilIcon className="h-4 w-4" />,
          getTo: process => `/admin/processes/${process.id}`
        },
        {
          label: 'Test',
          getTo: process => `/admin/processes/${process.id}/test`
        }
      ]}
    />
  );
}
