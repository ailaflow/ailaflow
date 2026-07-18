import { useLoader } from '@aibindkit/react';
import { useParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { UserEditor } from './user-editor';

export function UserEditorPage() {
  const { userId } = useParams();
  const apiClient = useApiClient();
  const loader = useLoader(
    abortSignal => {
      if (!userId) {
        throw new Error('User id is required');
      }
      return apiClient.user.getUser(abortSignal, userId);
    },
    [apiClient, userId]
  );

  if (loader.isLoading) {
    return <PortalLoadingView />;
  }
  if (loader.error) {
    return <PortalErrorView error={loader.error} />;
  }

  return <UserEditor user={loader.data.user} />;
}
