import { useParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '../../core/use-loader';
import { ContainerEditorContent } from './container-editor-content';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';

export function ContainerEditor() {
  const { name } = useParams();
  const apiClient = useApiClient();
  const { data, error, isLoading } = useLoader(
    abortSignal => {
      return name ? apiClient.container.getContainer(abortSignal, name) : Promise.resolve(null);
    },
    [name]
  );
  const container = data?.container;

  if (isLoading) {
    return <PortalLoadingView />;
  }
  if (error) {
    return <PortalErrorView error={error} />;
  }

  return <ContainerEditorContent key={container?.name ?? '_new'} container={container} />;
}
