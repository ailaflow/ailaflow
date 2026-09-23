import { useLoader } from '@aibindkit/react';
import { useParams } from 'react-router';
import { useApiClient } from '../../auth/auth-context';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { ProcessCronJobs } from './process-cron-jobs';
import { ProcessCronJobsContext } from './process-cron-jobs-context';
import { useAiStore } from '../common/admin-portal';

export function ProcessCronJobsPage() {
  const { processName } = useParams();
  if (!processName) {
    throw new Error('Process name is required');
  }

  const apiClient = useApiClient();
  const { data, error, isLoading, finishSignal } = useLoader(
    async signal => {
      const [processResponse, jobsResponse] = await Promise.all([
        apiClient.process.getProcess(signal, processName),
        apiClient.process.getProcessCronJobs(signal, processName)
      ]);
      return { process: processResponse.process, jobs: jobsResponse.jobs };
    },
    [apiClient, processName]
  );

  useAiStore(
    'processCronJobs',
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
    <ProcessCronJobsContext key={data.process.name} process={data.process} initialJobs={data.jobs}>
      <ProcessCronJobs />
    </ProcessCronJobsContext>
  );
}
