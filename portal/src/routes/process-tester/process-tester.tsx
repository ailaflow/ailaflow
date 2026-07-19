import { useNavigate, useParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '@aibindkit/react';
import { ProcessTesterContent } from './process-tester-content';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';

export function ProcessTester() {
  const { processName } = useParams();
  if (!processName) {
    throw new Error('Process name is required');
  }
  const apiClient = useApiClient();
  const navigate = useNavigate();

  const { data, error, isLoading } = useLoader(abortSignal => apiClient.process.getProcess(abortSignal, processName), [processName]);

  if (isLoading) {
    return <PortalLoadingView />;
  }
  if (error) {
    return <PortalErrorView error={error} />;
  }

  function openEditor() {
    navigate(`/admin/processes/${processName}`);
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
