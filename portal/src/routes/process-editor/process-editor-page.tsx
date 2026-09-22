import { ProcessEditor } from './process-editor';
import { ProcessEditorContext } from './process-editor-context';
import { useParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '@aibindkit/react';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { useAiStore } from '../common/admin-portal';

export function ProcessEditorPage() {
  const { processName } = useParams();
  const apiClient = useApiClient();

  const { data, isLoading, finishSignal, error } = useLoader(
    signal =>
      Promise.all([
        processName ? apiClient.process.getProcess(signal, processName) : Promise.resolve(null),
        apiClient.sandbox.getSandboxes(signal)
      ]),
    [processName]
  );

  useAiStore(
    'processEditor',
    store => {
      if (isLoading) {
        return store.bindWait(finishSignal);
      }
      if (error) {
        return store.bindError(error);
      }
    },
    [error, isLoading, finishSignal]
  );

  if (isLoading) {
    return <PortalLoadingView />;
  }
  if (error) {
    return <PortalErrorView error={error} />;
  }

  return (
    <ProcessEditorContext key={processName ?? '_new'} process={data[0]?.process} sandboxes={data[1].sandboxes}>
      <ProcessEditor />
    </ProcessEditorContext>
  );
}
