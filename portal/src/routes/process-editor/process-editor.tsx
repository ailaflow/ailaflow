import { AdminPortalLayout } from '../../components/layouts/admin-portal-layout';
import { ProcessEditorContent } from './process-editor-content';
import { ProcessEditorContext } from './process-editor-context';
import { useParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { ProcessDto } from '@aila/model';
import { useLoader } from '../../core/use-loader';

export function ProcessEditor() {
  const { processId } = useParams();
  const apiClient = useApiClient();
  let process: ProcessDto | undefined;
  if (processId) {
    const { data, error, isLoading } = useLoader(abortSignal => apiClient.process.getProcess(abortSignal, processId), [processId]);

    if (isLoading) {
      return <AdminPortalLayout disableScroll={true}>Loading...</AdminPortalLayout>;
    }

    if (error) {
      return <AdminPortalLayout disableScroll={true}>Error: {error.message}</AdminPortalLayout>;
    }

    process = data.process;
  }

  return (
    <AdminPortalLayout disableScroll={true}>
      <ProcessEditorContext process={process}>
        <ProcessEditorContent />
      </ProcessEditorContext>
    </AdminPortalLayout>
  );
}
