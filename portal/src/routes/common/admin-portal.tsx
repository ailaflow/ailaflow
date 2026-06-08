import { Outlet } from 'react-router';
import { AdminChatView } from '../../views/admin/admin-chat-view';
import { AdminPortalChat } from './admin-portal-chat';
import { AiBindingsContextProvider } from './ai-bindings/ai-bindings-context';
import { Portal } from './portal';

export function AdminPortal() {
  return (
    <AiBindingsContextProvider>
      <Portal>
        <AdminChatView chat={<AdminPortalChat />}>
          <Outlet />
        </AdminChatView>
      </Portal>
    </AiBindingsContextProvider>
  );
}
