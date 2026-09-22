import { useLoader } from '@aibindkit/react';
import { useParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { SandboxEditor } from './sandbox-editor';

export function SandboxEditorPage() {
  const { name } = useParams();
  const apiClient = useApiClient();
  const loader = useLoader(signal => (name ? apiClient.sandbox.getSandbox(signal, name) : Promise.resolve(null)), [apiClient, name]);

  if (loader.isLoading) {
    return <PortalLoadingView />;
  }
  if (loader.error) {
    return <PortalErrorView error={loader.error} />;
  }

  return <SandboxEditor sandbox={loader.data?.sandbox} />;
}
