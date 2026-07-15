import { Location, Outlet, matchRoutes, useLocation, useNavigate } from 'react-router';
import { AdminChatView } from '../../views/admin/admin-chat-view';
import { AdminPortalChat } from './admin-portal-chat';
import { RouterAdapter, aiEnvironment } from '@aibindkit/react';
import { Portal } from './portal';
import { sandboxListAiStoreFactory } from './ai-bindings/sandbox-list-ai-bindings';
import { sandboxEditorAiStoreFactory } from './ai-bindings/sandbox-editor-ai-bindings';
import { processEditorAiStoreFactory } from './ai-bindings/process-editor-ai-bindings';
import { processListAiStoreFactory } from './ai-bindings/process-list-ai-bindings';
import { routes } from '../router';
import { useEffect, useMemo, useRef } from 'react';

export const env = aiEnvironment({
  sandboxList: sandboxListAiStoreFactory(),
  sandboxEditor: sandboxEditorAiStoreFactory(),
  processEditor: processEditorAiStoreFactory(),
  processList: processListAiStoreFactory()
});
export const useAiEnvironment = env.useAiEnvironment;
export const useAiStore = env.useAiStore;
export const useUnsavedChangesController = env.useUnsavedChangesController;

function resolveCurrentRoute(location: Location) {
  const match = matchRoutes(routes, location)?.find(r => !r.route.children);
  return match && match.route.path
    ? {
        path: match.route.path,
        params: match.params
      }
    : null;
}

function useRouterAdapter(): RouterAdapter {
  const location = useLocation();
  const navigate = useNavigate();
  const currentRoute = useRef(resolveCurrentRoute(location));

  useEffect(() => {
    currentRoute.current = resolveCurrentRoute(location);
  }, [location]);

  return useMemo(
    () => ({
      getCurrentRoute: () => currentRoute.current,
      navigate: async path => {
        await navigate(path);
      }
    }),
    [navigate]
  );
}

export function AdminPortal() {
  const routerAdapter = useRouterAdapter();

  return (
    <env.Provider routerAdapter={routerAdapter}>
      <Portal>
        <AdminChatView chat={<AdminPortalChat />}>
          <Outlet />
        </AdminChatView>
      </Portal>
    </env.Provider>
  );
}
