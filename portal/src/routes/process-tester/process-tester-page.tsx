import { useNavigate, useParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '@aibindkit/react';
import { ProcessTester } from './process-tester';
import { ResourceEditorView } from '../../views/resource-editor/resource-editor-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';

export function ProcessTesterPage() {
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
      <ProcessTester process={data.process} />
    </ResourceEditorView>
  );
}
