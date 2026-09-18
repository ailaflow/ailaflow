import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '@aibindkit/react';
import { ResourceListView } from '../../views/resource-list/resource-list-view';
import { ResourceHeaderButtonView } from '../../views/resource-list/resource-header-button-view';
import { SvgIcon } from '../../views/common/svg-icons';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { useNavigate } from 'react-router';
import { toolSuccess } from '@aibindkit/react';
import { useCallback } from 'react';
import { useAiStore } from '../common/admin-portal';

export function SandboxListPage() {
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const { data, isLoading, finishSignal, error } = useLoader(abortSignal => apiClient.sandbox.getSandboxes(abortSignal), [apiClient]);

  const createNew = useCallback(() => {
    return navigate('/admin/create-sandbox');
  }, [navigate]);

  useAiStore(
    'sandboxList',
    store => {
      if (isLoading) {
        return store.bindWait(finishSignal);
      }
      if (error) {
        return store.bindError(error);
      }
      return store.bind({
        getSandboxes: async () =>
          data.sandboxes.map(sandbox => ({
            name: sandbox.name,
            description: sandbox.description,
            isEnabled: sandbox.isEnabled
          })),
        createNew: async () => {
          await createNew();
          return toolSuccess('Redirected to the sandbox creation form.');
        }
      });
    },
    [isLoading, finishSignal, error, data, createNew]
  );

  if (isLoading) {
    return <PortalLoadingView />;
  }
  if (error) {
    return <PortalErrorView error={error} />;
  }

  return (
    <ResourceListView
      title="Sandboxes"
      headerActions={<ResourceHeaderButtonView onClick={createNew}>Create new</ResourceHeaderButtonView>}
      columns={[
        {
          id: 'name',
          title: 'Name',
          width: '24%',
          getValue: sandbox => `+${sandbox.name}`
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
          wrap: true,
          getValue: sandbox => sandbox.description
        }
      ]}
      rows={data.sandboxes}
      getRowKey={sandbox => sandbox.name}
      emptyMessage="No sandboxes found."
      actions={[
        {
          label: 'Terminal',
          getTo: sandbox => `/admin/sandboxes/${encodeURIComponent(sandbox.name)}/terminal`
        },
        {
          label: <SvgIcon name="pencil" className="h-4 w-4" />,
          ariaLabel: 'Edit sandbox',
          getTo: sandbox => `/admin/sandboxes/${encodeURIComponent(sandbox.name)}`
        }
      ]}
    />
  );
}
