import { AdminChatView } from '../../views/admin/admin-chat-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { AdminPortalContext } from './admin-portal-context';
import { Portal } from './portal';

export function AdminPortal(props: { children: React.ReactNode }) {
  return (
    <AdminPortalContext>
      <Portal>
        <AdminChatView chat={<div>chat</div>}>{props.children}</AdminChatView>
      </Portal>
    </AdminPortalContext>
  );
}

export function AdminPortalLoading() {
  return (
    <AdminPortal>
      <PortalLoadingView />
    </AdminPortal>
  );
}

export function AdminPortalError(props: { error: Error }) {
  return (
    <AdminPortal>
      <PortalErrorView error={props.error} />
    </AdminPortal>
  );
}
