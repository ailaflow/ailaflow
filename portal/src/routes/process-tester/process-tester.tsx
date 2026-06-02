import { useNavigate, useParams } from 'react-router-dom';
import { AdminPortalLayout } from '../../components/layouts/admin-portal-layout';
import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '../../core/use-loader';
import { ProcessEditor } from '../../components/process-editor/process-editor';
import { ProcessTesterContent } from './process-tester-content';

export function ProcessTester() {
  const { processId } = useParams();
  if (!processId) {
    throw new Error('Process ID is required');
  }
  const apiClient = useApiClient();
  const navigate = useNavigate();

  const { data, error, isLoading } = useLoader(abortSignal => apiClient.process.getProcess(abortSignal, processId), [processId]);

  if (isLoading) {
    return <AdminPortalLayout disableScroll={true}>Loading...</AdminPortalLayout>;
  }

  if (error) {
    return <AdminPortalLayout disableScroll={true}>Error: {error.message}</AdminPortalLayout>;
  }

  function openEditor() {
    navigate(`/admin/processes/${processId}`);
  }

  return (
    <AdminPortalLayout disableScroll={true}>
      <ProcessEditor
        name={data.process.name}
        isNameReadOnly={true}
        isNameValid={true}
        switchLabel="Edit"
        canSwitch={true}
        onSwitch={openEditor}
      >
        <ProcessTesterContent process={data.process} />
      </ProcessEditor>
    </AdminPortalLayout>
  );
}
