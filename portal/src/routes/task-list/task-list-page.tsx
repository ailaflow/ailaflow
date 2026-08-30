import { toolError, toolWait, useLoader } from '@aibindkit/react';
import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useApiClient } from '../../auth/auth-context';
import { SvgIcon } from '../../views/common/svg-icons';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { ResourceHeaderSwitchView } from '../../views/resource-list/resource-header-switch-view';
import { ResourceListView } from '../../views/resource-list/resource-list-view';
import { useAiStore } from '../common/admin-portal';

const PAGE_SIZE = 20;

export function TaskListPage() {
  const apiClient = useApiClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [reloadToken, setReloadToken] = useState(0);
  const onlyOpen = searchParams.get('only-open') !== '0';
  const page = Number(searchParams.get('page') ?? 1);
  const { data, isLoading, finishSignal, error } = useLoader(
    abortSignal => apiClient.task.getTasks(abortSignal, { onlyOpen, page, pageSize: PAGE_SIZE }),
    [apiClient, onlyOpen, page, reloadToken]
  );

  function changeOnlyOpen(value: 'open' | 'all'): void {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      next.set('only-open', value === 'open' ? '1' : '0');
      next.set('page', '1');
      return next;
    });
  }

  function changePage(value: number): void {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      next.set('page', String(value));
      return next;
    });
  }

  async function deleteTask(id: string, title: string): Promise<void> {
    if (!window.confirm(`Delete task "${title}" and its persisted execution? This cannot be undone.`)) {
      return;
    }

    try {
      await apiClient.task.deleteTask(AbortSignal.timeout(5_000), id);
      changePage(1);
      setReloadToken(current => current + 1);
    } catch (e) {
      window.alert(`Failed to delete task "${title}": ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  useAiStore(
    'taskList',
    store =>
      store.bind({
        getTasks: async () => {
          if (isLoading) {
            return toolWait(finishSignal);
          }
          if (error) {
            return toolError(error);
          }
          return data.tasks;
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
      title="Tasks"
      headerActions={
        <ResourceHeaderSwitchView
          ariaLabel="Filter tasks by status"
          value={onlyOpen ? 'open' : 'all'}
          options={[
            { value: 'open', label: 'Open' },
            { value: 'all', label: 'All' }
          ]}
          onChange={changeOnlyOpen}
        />
      }
      columns={[
        {
          id: 'title',
          title: 'Title',
          width: '18%',
          leadingBadge: 'T',
          getValue: task => task.title
        },
        {
          id: 'status',
          title: 'Status',
          width: '10%',
          getValue: task => {
            if (task.completedAt !== undefined) {
              return 'Completed';
            }
            return task.isOutdated ? 'Outdated' : 'Open';
          }
        },
        {
          id: 'assignments',
          title: 'Assignments',
          width: '10%',
          getValue: task => `${task.completedCount} / ${task.assignedCount}`
        },
        {
          id: 'createdBy',
          title: 'Created by',
          width: '12%',
          getValue: task => `@${task.createdBy}`
        },
        {
          id: 'type',
          title: 'Type',
          width: '8%',
          getValue: task => (task.isTest ? 'Test' : 'Live')
        },
        {
          id: 'createdAt',
          title: 'Created',
          width: '10%',
          getValue: task => new Date(task.createdAt).toLocaleString()
        }
      ]}
      rows={data.tasks}
      getRowKey={task => task.id}
      emptyMessage="No tasks found."
      pagination={{
        page: data.page,
        pageSize: data.pageSize,
        totalCount: data.totalCount,
        onPageChange: changePage
      }}
      actions={[
        {
          label: <SvgIcon name="x" className="h-4 w-4" />,
          ariaLabel: task => `Delete task ${task.title}`,
          danger: true,
          onClick: task => deleteTask(task.id, task.title)
        }
      ]}
    />
  );
}
