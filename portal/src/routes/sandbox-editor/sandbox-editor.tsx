import { useParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '../../core/use-loader';
import { SandboxEditorContent } from './sandbox-editor-content';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';

export function SandboxEditor() {
  const { name } = useParams();
  const apiClient = useApiClient();
  const { data, error, isLoading } = useLoader(
    abortSignal => {
      return name ? apiClient.sandbox.getSandbox(abortSignal, name) : Promise.resolve(null);
    },
    [name]
  );
  const sandbox = data?.sandbox;

  if (isLoading) {
    return <PortalLoadingView />;
  }
  if (error) {
    return <PortalErrorView error={error} />;
  }

  return <SandboxEditorContent key={sandbox?.name ?? '_new'} sandbox={sandbox} />;
}
