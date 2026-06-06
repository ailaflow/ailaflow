import { useParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '../../core/use-loader';
import { AdminPortal, AdminPortalError, AdminPortalLoading } from '../common/admin-portal';
import { ContainerEditorState, LoadedContainerEditor } from './container-editor-content';

export function ContainerEditor() {
  const { name } = useParams();
  const apiClient = useApiClient();
  let state: ContainerEditorState;
  let isNew = true;
  if (name) {
    const { data, error, isLoading } = useLoader(abortSignal => apiClient.container.getContainer(abortSignal, name), [name]);

    if (isLoading) {
      return <AdminPortalLoading />;
    }
    if (error) {
      return <AdminPortalError error={error} />;
    }
    state = data.container;
    isNew = false;
  } else {
    state = {
      name: '',
      isEnabled: true,
      description: '',
      configuration: ''
    };
  }

  return (
    <AdminPortal>
      <LoadedContainerEditor isNew={isNew} initialContainer={state} />
    </AdminPortal>
  );
}
