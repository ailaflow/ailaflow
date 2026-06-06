import { ProcessEditorContent } from './process-editor-content';
import { ProcessEditorContext } from './process-editor-context';
import { useParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { ProcessDto } from '@aila/model';
import { useLoader } from '../../core/use-loader';
import { AdminPortal, AdminPortalError, AdminPortalLoading } from '../common/admin-portal';

export function ProcessEditor() {
  const { processId } = useParams();
  const apiClient = useApiClient();
  let process: ProcessDto | undefined;
  if (processId) {
    const { data, error, isLoading } = useLoader(abortSignal => apiClient.process.getProcess(abortSignal, processId), [processId]);

    if (isLoading) {
      return <AdminPortalLoading />;
    }
    if (error) {
      return <AdminPortalError error={error} />;
    }
    process = data.process;
  }

  return (
    <AdminPortal>
      <ProcessEditorContext process={process}>
        <ProcessEditorContent />
      </ProcessEditorContext>
    </AdminPortal>
  );
}
