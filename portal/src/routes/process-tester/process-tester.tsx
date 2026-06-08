import { useNavigate, useParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '../../core/use-loader';
import { ProcessTesterContent } from './process-tester-content';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';

export function ProcessTester() {
  const { processId } = useParams();
  if (!processId) {
    throw new Error('Process ID is required');
  }
  const apiClient = useApiClient();
  const navigate = useNavigate();

  const { data, error, isLoading } = useLoader(abortSignal => apiClient.process.getProcess(abortSignal, processId), [processId]);

  if (isLoading) {
    return <PortalLoadingView />;
  }
  if (error) {
    return <PortalErrorView error={error} />;
  }

  function openEditor() {
    navigate(`/admin/processes/${processId}`);
  }

  return (
    <ResourceEditorView
      icon="/"
      name={data.process.name}
      isNameReadOnly={true}
      isNameValid={true}
      switchLabel="Edit"
      canSwitch={true}
      onSwitch={openEditor}
    >
      <ProcessTesterContent process={data.process} />
    </ResourceEditorView>
  );
}
