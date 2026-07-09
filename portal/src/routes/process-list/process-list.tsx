import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '../../core/use-loader';
import { ResourceListView } from '../../views/resource-list/resource-list-view';
import { PencilIcon } from '../../views/common/svg-icons';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { useEffect } from 'react';
import { useAiBindings } from '../common/ai-bindings/ai-bindings-context';
import { toolError, toolSuccess, toolWait } from '../common/ai-bindings/ai-tool-results';
import { useNavigate } from 'react-router';

export function ProcessList() {
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const { data, isLoading, finishSignal, error } = useLoader(abortSignal => apiClient.process.getProcesses(abortSignal), [apiClient]);
  const { stores } = useAiBindings();

  function createNew() {
    return navigate('/admin/create-process');
  }

  useEffect(
    () =>
      stores.processList.bind({
        processList_getProcesses: async () => {
          if (isLoading) {
            return toolWait(finishSignal);
          }
          if (error) {
            return toolError(error);
          }
          return data.processes.map(process => ({
            name: `\$${process.name}`,
            description: process.description,
            userList: process.userList
          }));
        },
        processList_createNew: async () => {
          await createNew();
          return toolSuccess('Redirected to the process creation form.');
        }
      }),
    [stores, data, error, finishSignal]
  );

  if (isLoading) {
    return <PortalLoadingView />;
  }
  if (error) {
    return <PortalErrorView error={error} />;
  }

  return (
    <ResourceListView
      title="Processes"
      createNewLabel="Create new"
      onCreateNewClicked={createNew}
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
