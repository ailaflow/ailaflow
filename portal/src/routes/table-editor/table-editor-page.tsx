import { useLoader } from '@aibindkit/react';
import { useParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { useAiStore } from '../common/admin-portal';
import { TableEditor } from './table-editor';

export function TableEditorPage() {
  const { tableName } = useParams();
  const apiClient = useApiClient();
  const loader = useLoader(
    signal => (tableName ? apiClient.table.getTable(signal, tableName) : Promise.resolve(null)),
    [apiClient, tableName]
  );

  useAiStore(
    'tableEditor',
    store => {
      if (loader.isLoading) {
        return store.bindWait(loader.finishSignal);
      }
      if (loader.error) {
        return store.bindError(loader.error);
      }
    },
    [loader.error, loader.finishSignal, loader.isLoading]
  );

  if (loader.isLoading) {
    return <PortalLoadingView />;
  }
  if (loader.error) {
    return <PortalErrorView error={loader.error} />;
  }

  return <TableEditor key={tableName ?? '_new'} table={loader.data?.table} />;
}
