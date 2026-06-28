import { ProcessEditorContent } from './process-editor-content';
import { ProcessEditorContext } from './process-editor-context';
import { useParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '../../core/use-loader';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { useAiBindings } from '../common/ai-bindings/ai-bindings-context';
import { useEffect } from 'react';

export function ProcessEditor() {
  const { processId } = useParams();
  const { stores } = useAiBindings();
  const apiClient = useApiClient();

  const { data, isLoading, finishSignal, error } = useLoader(
    abortSignal =>
      Promise.all([
        processId ? apiClient.process.getProcess(abortSignal, processId) : Promise.resolve(null),
        apiClient.sandbox.getSandboxes(abortSignal)
      ]),
    [processId]
  );

  useEffect(() => {
    if (isLoading) {
      return stores.processEditor.bindWait(finishSignal);
    }
    if (error) {
      return stores.processEditor.bindError(error);
    }
  }, [stores, error, isLoading, finishSignal]);

  if (isLoading) {
    return <PortalLoadingView />;
  }
  if (error) {
    return <PortalErrorView error={error} />;
  }

  return (
    <ProcessEditorContext key={processId ?? '_new'} process={data[0]?.process} sandboxes={data[1].sandboxes}>
      <ProcessEditorContent />
    </ProcessEditorContext>
  );
}
