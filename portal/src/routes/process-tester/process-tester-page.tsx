import { useParams } from 'react-router';
import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '@aibindkit/react';
import { ProcessTester } from './process-tester';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { ProcessTesterContext } from './process-tester-context';
import { useAiStore } from '../common/admin-portal';

export function ProcessTesterPage() {
  const { processName } = useParams();
  if (!processName) {
    throw new Error('Process name is required');
  }
  const apiClient = useApiClient();

  const { data, error, isLoading, finishSignal } = useLoader(
    signal => apiClient.process.getProcess(signal, processName),
    [apiClient, processName]
  );

  useAiStore(
    'processTester',
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
    <ProcessTesterContext key={data.process.name} process={data.process}>
      <ProcessTester process={data.process} />
    </ProcessTesterContext>
  );
}
