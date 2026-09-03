import { useLoader } from '@aibindkit/react';
import { useParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { SandboxTerminal } from './sandbox-terminal';
import { SandboxTerminalContext } from './sandbox-terminal-context';
import { useAiStore } from '../common/admin-portal';

export function SandboxTerminalPage() {
  const { name } = useParams();
  if (!name) {
    throw new Error('Sandbox name is required');
  }

  const apiClient = useApiClient();
  const { data, error, isLoading, finishSignal } = useLoader(
    abortSignal => apiClient.sandbox.getSandbox(abortSignal, name),
    [apiClient, name]
  );

  useAiStore(
    'sandboxTerminal',
    store => {
      if (isLoading) {
        return store.bindWait(finishSignal);
      }
      if (error) {
        return store.bindError(error);
      }
    },
    [error, finishSignal, isLoading]
  );

  if (isLoading) {
    return <PortalLoadingView />;
  }
  if (error) {
    return <PortalErrorView error={error} />;
  }

  return (
    <SandboxTerminalContext key={data.sandbox.name} sandbox={data.sandbox}>
      <SandboxTerminal />
    </SandboxTerminalContext>
  );
}
