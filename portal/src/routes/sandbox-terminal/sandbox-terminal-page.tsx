import { useLoader } from '@aibindkit/react';
import { useParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { SandboxTerminal } from './sandbox-terminal';

export function SandboxTerminalPage() {
  const { name } = useParams();
  if (!name) {
    throw new Error('Sandbox name is required');
  }

  const apiClient = useApiClient();
  const { data, error, isLoading } = useLoader(abortSignal => apiClient.sandbox.getSandbox(abortSignal, name), [apiClient, name]);

  if (isLoading) {
    return <PortalLoadingView />;
  }
  if (error) {
    return <PortalErrorView error={error} />;
  }

  return <SandboxTerminal key={data.sandbox.name} sandbox={data.sandbox} />;
}
