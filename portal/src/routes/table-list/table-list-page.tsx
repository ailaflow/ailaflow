import { toolError, toolSuccess, toolWait, useLoader } from '@aibindkit/react';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useApiClient } from '../../auth/auth-context';
import { SvgIcon } from '../../views/common/svg-icons';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { ResourceHeaderButtonView } from '../../views/resource-list/resource-header-button-view';
import { ResourceListView } from '../../views/resource-list/resource-list-view';
import { useAiStore } from '../common/admin-portal';

const PAGE_SIZE = 20;

export function TableListPage() {
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reloadToken, setReloadToken] = useState(0);
  const page = Number(searchParams.get('page') ?? 1);
  const { data, isLoading, finishSignal, error } = useLoader(
    abortSignal => apiClient.table.getTables(abortSignal, { page, pageSize: PAGE_SIZE }),
    [apiClient, page, reloadToken]
  );

  function createNew() {
    return navigate('/admin/create-table');
  }

  function changePage(value: number): void {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      next.set('page', String(value));
      return next;
    });
  }

  async function deleteTable(name: string): Promise<void> {
    if (!window.confirm(`Delete table "${name}" and all of its data? This cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.table.deleteTable(AbortSignal.timeout(5_000), name);
      changePage(1);
      setReloadToken(current => current + 1);
    } catch (e) {
      window.alert(`Failed to delete table "${name}": ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  useAiStore(
    'tableList',
    store =>
      store.bind({
        getTables: async () => {
          if (isLoading) {
            return toolWait(finishSignal);
          }
          if (error) {
            return toolError(error);
          }
          return data.tables;
        },
        createNew: async () => {
          await createNew();
          return toolSuccess('Redirected to the table creation form.');
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
      title="Tables"
      headerActions={<ResourceHeaderButtonView onClick={createNew}>Create new</ResourceHeaderButtonView>}
      columns={[
        {
          id: 'name',
          title: 'Name',
          width: '30%',
          leadingBadge: '#',
          getValue: table => table.name
        },
        {
          id: 'description',
          title: 'Description',
          width: '52%',
          wrap: true,
          getValue: table => table.description
        }
      ]}
      rows={data.tables}
      getRowKey={table => table.name}
      emptyMessage="No tables found."
      pagination={{
        page: data.page,
        pageSize: data.pageSize,
        totalCount: data.totalCount,
        onPageChange: changePage
      }}
      actions={[
        {
          label: <SvgIcon name="pencil" className="h-4 w-4" />,
          ariaLabel: table => `Edit table ${table.name}`,
          getTo: table => `/admin/tables/${encodeURIComponent(table.name)}`
        },
        {
          label: <SvgIcon name="x" className="h-4 w-4" />,
          ariaLabel: table => `Delete table ${table.name}`,
          danger: true,
          onClick: table => deleteTable(table.name)
        }
      ]}
    />
  );
}
