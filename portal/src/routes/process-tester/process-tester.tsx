import { useNavigate, useParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '../../core/use-loader';
import { ProcessTesterContent } from './process-tester-content';
import { AdminPortal, AdminPortalError, AdminPortalLoading } from '../common/admin-portal';
import { ProcessEditorView } from '../../views/process-editor/process-editor-view';

export function ProcessTester() {
  const { processId } = useParams();
  if (!processId) {
    throw new Error('Process ID is required');
  }
  const apiClient = useApiClient();
  const navigate = useNavigate();

  const { data, error, isLoading } = useLoader(abortSignal => apiClient.process.getProcess(abortSignal, processId), [processId]);

  if (isLoading) {
    return <AdminPortalLoading />;
  }
  if (error) {
    return <AdminPortalError error={error} />;
  }

  function openEditor() {
    navigate(`/admin/processes/${processId}`);
  }

  return (
    <AdminPortal>
      <ProcessEditorView
        name={data.process.name}
        isNameReadOnly={true}
        isNameValid={true}
        switchLabel="Edit"
        canSwitch={true}
        onSwitch={openEditor}
      >
        <ProcessTesterContent process={data.process} />
      </ProcessEditorView>
    </AdminPortal>
  );
}
