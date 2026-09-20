import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '@aibindkit/react';
import { ResourceListView } from '../../views/resource-list/resource-list-view';
import { ResourceHeaderButtonView } from '../../views/resource-list/resource-header-button-view';
import { SvgIcon } from '../../views/common/svg-icons';
import { ProcessIcon } from '../../views/common/process-icon';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { toolError, toolSuccess, toolWait } from '@aibindkit/react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAiStore } from '../common/admin-portal';
import { useState } from 'react';
import { ProcessDisplay } from '@ailaflow/shared';

const PAGE_SIZE = 20;

export function ProcessListPage() {
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reloadToken, setReloadToken] = useState(0);
  const page = Number(searchParams.get('page') ?? 1);
  const { data, isLoading, finishSignal, error } = useLoader(
    abortSignal => apiClient.process.getProcesses(abortSignal, { page, pageSize: PAGE_SIZE }),
    [apiClient, page, reloadToken]
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

  async function deleteProcess(name: string): Promise<void> {
    if (!window.confirm(`Delete process "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.process.deleteProcess(AbortSignal.timeout(5_000), name);
      changePage(1);
      setReloadToken(current => current + 1);
    } catch (e) {
      window.alert(`Failed to delete process "${name}": ${e instanceof Error ? e.message : String(e)}`);
    }
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
            name: `/${process.name}`,
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
          getLeadingVisual: process => <ProcessIcon name={process.name} className="h-8 w-8" />,
          getValue: process =>
            process.display !== ProcessDisplay.HIDDEN ? (
              `/${process.name}`
            ) : (
              <span className="text-gray-400">
                /{process.name} <small>(Hidden)</small>
              </span>
            )
        },
        {
          id: 'description',
          title: 'Description',
          width: '30%',
          wrap: true,
          getValue: process => process.description
        },
        {
          id: 'userAccessExpression',
          title: 'User access',
          width: '16%',
          getValue: process => process.userAccessExpression.trim() || 'all'
        },
        {
          id: 'isPausable',
          title: 'Pausable',
          width: '10%',
          getValue: process => (process.isPausable ? 'yes' : '')
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
          label: 'Test',
          getTo: process => `/admin/processes/${encodeURIComponent(process.name)}/test`
        },
        {
          label: 'Cron',
          getTo: process => `/admin/processes/${encodeURIComponent(process.name)}/cron-jobs`
        },
        {
          label: <SvgIcon name="pencil" className="h-4 w-4" />,
          ariaLabel: process => `Edit process ${process.name}`,
          getTo: process => `/admin/processes/${encodeURIComponent(process.name)}`
        },
        {
          label: <SvgIcon name="x" className="h-4 w-4" />,
          ariaLabel: process => `Delete process ${process.name}`,
          danger: true,
          onClick: process => deleteProcess(process.name)
        }
      ]}
    />
  );
}
