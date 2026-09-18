import { useLoader, toolError, toolSuccess, toolWait } from '@aibindkit/react';
import { useNavigate, useSearchParams } from 'react-router';
import { useApiClient } from '../../auth/auth-context';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { ResourceListView } from '../../views/resource-list/resource-list-view';
import { ResourceHeaderButtonView } from '../../views/resource-list/resource-header-button-view';
import { useAiStore } from '../common/admin-portal';
import { SvgIcon } from '../../views/common/svg-icons';

const PAGE_SIZE = 20;

export function UserListPage() {
  const apiClient = useApiClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? 1);
  const loader = useLoader(abortSignal => apiClient.user.getUsers(abortSignal, { page, pageSize: PAGE_SIZE }), [apiClient, page]);

  function createNew() {
    return navigate('/admin/create-user');
  }

  function changePage(value: number): void {
    setSearchParams(current => {
      const next = new URLSearchParams(current);
      next.set('page', String(value));
      return next;
    });
  }

  useAiStore(
    'userList',
    store =>
      store.bind({
        getUsers: async () => {
          if (loader.isLoading) {
            return toolWait(loader.finishSignal);
          }
          if (loader.error) {
            return toolError(loader.error);
          }
          return loader.data.users.map(user => ({
            name: user.name,
            isAdmin: user.isAdmin
          }));
        },
        createNew: async () => {
          await createNew();
          return toolSuccess('Redirected to the user creation form.');
        }
      }),
    [loader]
  );

  if (loader.isLoading) {
    return <PortalLoadingView />;
  }
  if (loader.error) {
    return <PortalErrorView error={loader.error} />;
  }

  return (
    <ResourceListView
      title="Users"
      headerActions={<ResourceHeaderButtonView onClick={createNew}>Create new</ResourceHeaderButtonView>}
      columns={[
        {
          id: 'name',
          title: 'Name',
          width: '42%',
          getValue: user => `@${user.name}`
        },
        {
          id: 'role',
          title: 'Role',
          width: '18%',
          getValue: user => (user.isAdmin ? 'Admin' : 'User')
        }
      ]}
      rows={loader.data.users}
      getRowKey={user => user.name}
      emptyMessage="No users found."
      pagination={{
        page: loader.data.page,
        pageSize: loader.data.pageSize,
        totalCount: loader.data.totalCount,
        onPageChange: changePage
      }}
      actions={[
        {
          label: 'Telegram',
          getTo: user => `/admin/users/${encodeURIComponent(user.name)}/telegram`
        },
        {
          label: <SvgIcon name="pencil" className="h-4 w-4" />,
          ariaLabel: user => `Edit user ${user.name}`,
          getTo: user => `/admin/users/${encodeURIComponent(user.name)}`
        }
      ]}
    />
  );
}
