import { useParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { useLoader } from '../../core/use-loader';
import { AdminPortal, AdminPortalError, AdminPortalLoading } from '../common/admin-portal';
import { ContainerEditorContent } from './container-editor-content';

export function ContainerEditor() {
  const { name } = useParams();
  const apiClient = useApiClient();
  const { data, error, isLoading } = useLoader(
    abortSignal => {
      return name ? apiClient.container.getContainer(abortSignal, name) : Promise.resolve(null);
    },
    [name]
  );
  const container = data?.container;

  if (isLoading) {
    return <AdminPortalLoading />;
  }
  if (error) {
    return <AdminPortalError error={error} />;
  }

  return (
    <AdminPortal>
      <ContainerEditorContent key={container?.name ?? '_new'} container={container} />
    </AdminPortal>
  );
}
