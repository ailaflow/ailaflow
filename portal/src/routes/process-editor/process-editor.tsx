import { ProcessEditorContent } from './process-editor-content';
import { ProcessEditorContext } from './process-editor-context';
import { useParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '../../core/use-loader';
import { AdminPortal, AdminPortalError, AdminPortalLoading } from '../common/admin-portal';

export function ProcessEditor() {
  const { processId } = useParams();
  const apiClient = useApiClient();

  const { data, error, isLoading } = useLoader(
    abortSignal =>
      Promise.all([
        processId ? apiClient.process.getProcess(abortSignal, processId) : Promise.resolve(null),
        apiClient.container.getContainers(abortSignal)
      ]),
    [processId]
  );

  if (isLoading) {
    return <AdminPortalLoading />;
  }
  if (error) {
    return <AdminPortalError error={error} />;
  }

  return (
    <AdminPortal>
      <ProcessEditorContext key={processId ?? '_new'} process={data[0]?.process} containers={data[1].containers}>
        <ProcessEditorContent />
      </ProcessEditorContext>
    </AdminPortal>
  );
}
