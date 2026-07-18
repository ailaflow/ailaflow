import { useLoader, toolError, toolWait } from '@aibindkit/react';
import { useApiClient } from '../../auth/auth-context';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { ResourceListView } from '../../views/resource-list/resource-list-view';
import { useAiStore } from '../common/admin-portal';

export function UserList() {
  const apiClient = useApiClient();
  const loader = useLoader(abortSignal => apiClient.user.getUsers(abortSignal), [apiClient]);

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
            id: user.id,
            name: user.name,
            isAdmin: user.isAdmin
          }));
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
      columns={[
        {
          id: 'name',
          title: 'Name',
          width: '42%',
          leadingBadge: '@',
          getValue: user => user.name
        },
        {
          id: 'role',
          title: 'Role',
          width: '18%',
          getValue: user => (user.isAdmin ? 'Admin' : 'User')
        },
        {
          id: 'id',
          title: 'ID',
          width: '40%',
          getValue: user => user.id
        }
      ]}
      rows={loader.data.users}
      getRowKey={user => user.id}
      emptyMessage="No users found."
    />
  );
}
