import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '@aibindkit/react';
import { ResourceListView } from '../../views/resource-list/resource-list-view';
import { ResourceHeaderButtonView } from '../../views/resource-list/resource-header-button-view';
import { SvgIcon } from '../../views/common/svg-icons';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { toolError, toolSuccess, toolWait } from '@aibindkit/react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAiStore } from '../common/admin-portal';

const PAGE_SIZE = 20;

export function ProcessListPage() {
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? 1);
  const { data, isLoading, finishSignal, error } = useLoader(
    abortSignal => apiClient.process.getProcesses(abortSignal, { page, pageSize: PAGE_SIZE }),
    [apiClient, page]
  );

  function createNew() {
    return navigate('/admin/create-process');
  }

  function changePage(value: number): void {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      next.set('page', String(value));
      return next;
    });
  }

  useAiStore(
    'processList',
    store =>
      store.bind({
        getProcesses: async () => {
          if (isLoading) {
            return toolWait(finishSignal);
          }
          if (error) {
            return toolError(error);
          }
          return data.processes.map(process => ({
            name: `\$${process.name}`,
            description: process.description,
            userAccessExpression: process.userAccessExpression
          }));
        },
        createNew: async () => {
          await createNew();
          return toolSuccess('Redirected to the process creation form.');
        }
      }),
    [data, error, finishSignal, isLoading]
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
      headerActions={<ResourceHeaderButtonView onClick={createNew}>Create new</ResourceHeaderButtonView>}
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
          id: 'userAccessExpression',
          title: 'User access',
          width: '16%',
          getValue: process => process.userAccessExpression.trim() || 'all'
        }
      ]}
      rows={data.processes}
      getRowKey={process => process.name}
      emptyMessage="No processes found."
      pagination={{
        page: data.page,
        pageSize: data.pageSize,
        totalCount: data.totalCount,
        onPageChange: changePage
      }}
      actions={[
        {
          label: <SvgIcon name="pencil" className="h-4 w-4" />,
          getTo: process => `/admin/processes/${process.name}`
        },
        {
          label: 'Test',
          getTo: process => `/admin/processes/${process.name}/test`
        }
      ]}
    />
  );
}
