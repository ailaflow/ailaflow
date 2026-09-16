import { useLoader } from '@aibindkit/react';
import { useApiClient } from '../../auth/auth-context';
import { MySlackConfigurationView } from '../../views/my-configuration/my-slack-configuration-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';

export function MySlackConfiguration() {
  const apiClient = useApiClient();
  const loader = useLoader(abortSignal => apiClient.mySlackConfiguration.get(abortSignal), [apiClient]);
  if (loader.isLoading) {
    return <PortalLoadingView />;
  }
  if (loader.error) {
    return <PortalErrorView error={loader.error} />;
  }
  return <MySlackConfigurationView configuration={loader.data} />;
}
