import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '@aibindkit/react';
import { ResourceListView } from '../../views/resource-list/resource-list-view';
import { ResourceHeaderButtonTheme, ResourceHeaderButtonView } from '../../views/resource-list/resource-header-button-view';
import { SvgIcon } from '../../views/common/svg-icons';
import { ProcessIcon } from '../../views/common/process-icon';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { toolError, toolSuccess, toolWait } from '@aibindkit/react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAiStore } from '../common/admin-portal';
import { useState } from 'react';
import { ProcessDisplay, ProcessExecutionMode, ProcessExecutionTraceRetention, ProcessLiteDto } from '@ailaflow/shared';

const PAGE_SIZE = 20;

export function ProcessListPage() {
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reloadToken, setReloadToken] = useState(0);
  const page = Number(searchParams.get('page') ?? 1);
  const { data, isLoading, finishSignal, error } = useLoader(
    signal => apiClient.process.getProcesses(signal, { page, pageSize: PAGE_SIZE }),
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

  async function importProcess() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async () => {
      if (!input.files || input.files.length === 0) {
        return;
      }
      const file = input.files[0];
      const content = await file.text();
      try {
        await apiClient.process.importProcess(AbortSignal.timeout(5_000), {
          process: JSON.parse(content)
        });
        setReloadToken(current => current + 1);
      } catch (e) {
        window.alert(`Failed to import process: ${(e as Error).message ?? e}`);
      }
    };
    input.click();
  }

  async function exportProcess(name: string) {
    const result = await apiClient.process.exportProcess(AbortSignal.timeout(5_000), name);

    const content = JSON.stringify(result.exportedProcess, null, 2);
    const file = new Blob([content], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = `${name}.json`;
    a.click();
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
      headerActions={
        <>
          <ResourceHeaderButtonView onClick={createNew}>Create new</ResourceHeaderButtonView>
          <ResourceHeaderButtonView onClick={importProcess} theme={ResourceHeaderButtonTheme.SECONDARY}>
            Import
          </ResourceHeaderButtonView>
        </>
      }
      columns={[
        {
          id: 'name',
          title: 'Name',
          width: '22%',
          getLeadingVisual: process => <ProcessIcon name={process.name} icon={process.icon} className="h-8 w-8" />,
          disabled: process => (process.display === ProcessDisplay.HIDDEN ? 'Hidden' : undefined),
          getValue: process => `/${process.name}`
        },
        {
          id: 'description',
          title: 'Description',
          width: '36%',
          wrap: true,
          getValue: process => process.description
        },
        {
          id: 'userAccessExpression',
          title: 'User access',
          width: '10%',
          getValue: process => process.userAccessExpression.trim() || 'all'
        },
        {
          id: 'sandboxes',
          title: 'Sandboxes',
          width: '5%',
          getValue: process => process.sandboxNames.map(name => `+${name}`).join(', ')
        },
        {
          id: 'characteristic',
          title: 'Characteristic',
          width: '5%',
          getValue: process =>
            [
              process.nTasksSteps > 0 ? 'task' : null,
              process.executionMode === ProcessExecutionMode.START_FORM ? 'only form' : null,
              process.nReturnSteps > 0 ? 'return' : null
            ]
              .filter(Boolean)
              .join(', ')
        },
        {
          id: 'size',
          title: 'Size',
          width: '4%',
          getValue: process => `${Math.ceil(process.definitionSize / 1024)} KB`
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
      primaryAction={{
        icon: <SvgIcon name="pencil" className="h-4 w-4" />,
        ariaLabel: 'Edit process',
        getTo: process => `/admin/processes/${process.name}`
      }}
      actions={[
        {
          label: 'Test',
          getTo: p => `/admin/processes/${p.name}/test`
        },
        {
          label: 'Cron',
          getTo: p => `/admin/processes/${p.name}/cron-jobs`
        },
        {
          label: 'Delete',
          ariaLabel: p => `Delete process ${p.name}`,
          onClick: p => deleteProcess(p.name)
        },
        {
          label: 'Traces',
          isVisible: p => p.traceRetention !== ProcessExecutionTraceRetention.DISABLED,
          getTo: p => `/admin/process-execution-traces/?process=${p.name}`
        },
        {
          label: 'Export',
          onClick: p => exportProcess(p.name)
        }
      ]}
    />
  );
}
