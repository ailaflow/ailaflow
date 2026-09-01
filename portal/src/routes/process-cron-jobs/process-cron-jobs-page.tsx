import { useLoader } from '@aibindkit/react';
import { useParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { ProcessCronJobs } from './process-cron-jobs';

export function ProcessCronJobsPage() {
  const { processName } = useParams();
  if (!processName) {
    throw new Error('Process name is required');
  }

  const apiClient = useApiClient();
  const { data, error, isLoading } = useLoader(
    async abortSignal => {
      const [processResponse, jobsResponse] = await Promise.all([
        apiClient.process.getProcess(abortSignal, processName),
        apiClient.process.getProcessCronJobs(abortSignal, processName)
      ]);
      return { process: processResponse.process, jobs: jobsResponse.jobs };
    },
    [apiClient, processName]
  );

  if (isLoading) {
    return <PortalLoadingView />;
  }
  if (error) {
    return <PortalErrorView error={error} />;
  }
  return <ProcessCronJobs key={data.process.name} process={data.process} initialJobs={data.jobs} />;
}
