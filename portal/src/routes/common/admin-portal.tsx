import { AdminChatView } from '../../views/admin/admin-chat-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { AdminPortalChat } from './admin-portal-chat';
import { AiBindingsContextProvider } from './ai-bindings/ai-bindings-context';
import { Portal } from './portal';

export function AdminPortal(props: { children: React.ReactNode }) {
  return (
    <AiBindingsContextProvider>
      <Portal>
        <AdminChatView chat={<AdminPortalChat />}>{props.children}</AdminChatView>
      </Portal>
    </AiBindingsContextProvider>
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
