import { Location, Outlet, matchRoutes, useLocation, useNavigate } from 'react-router';
import { AdminChatView } from '../../views/admin/admin-chat-view';
import { AdminPortalChat } from './admin-portal-chat';
import { RouterAdapter, aiEnvironment } from '@aibindkit/react';
import { Portal } from './portal';
import { sandboxListAiStoreFactory } from './ai-bindings/sandbox-list-ai-bindings';
import { sandboxEditorAiStoreFactory } from './ai-bindings/sandbox-editor-ai-bindings';
import { processEditorAiStoreFactory } from './ai-bindings/process-editor-ai-bindings';
import { processListAiStoreFactory } from './ai-bindings/process-list-ai-bindings';
import { userListAiStoreFactory } from './ai-bindings/user-list-ai-bindings';
import { userEditorAiStoreFactory } from './ai-bindings/user-editor-ai-binding';
import { routes } from '../router';
import { useEffect, useMemo, useRef } from 'react';
import { globalAiStoreFactory } from './ai-bindings/global-ai-bindings';
import { tableListAiStoreFactory } from './ai-bindings/table-list-ai-bindings';
import { tableEditorAiStoreFactory } from './ai-bindings/table-editor-ai-bindings';
import { taskListAiStoreFactory } from './ai-bindings/task-list-ai-bindings';
import { processTesterAiStoreFactory } from './ai-bindings/process-tester-ai-bindings';
import { processCronJobsAiStoreFactory } from './ai-bindings/process-cron-jobs-ai-bindings';
import { sandboxTerminalAiStoreFactory } from './ai-bindings/sandbox-terminal-ai-bindings';

export const env = aiEnvironment({
  global: globalAiStoreFactory(),
  sandboxList: sandboxListAiStoreFactory(),
  sandboxEditor: sandboxEditorAiStoreFactory(),
  processEditor: processEditorAiStoreFactory(),
  processList: processListAiStoreFactory(),
  userList: userListAiStoreFactory(),
  userEditor: userEditorAiStoreFactory(),
  tableList: tableListAiStoreFactory(),
  tableEditor: tableEditorAiStoreFactory(),
  taskList: taskListAiStoreFactory(),
  processTester: processTesterAiStoreFactory(),
  processCronJobs: processCronJobsAiStoreFactory(),
  sandboxTerminal: sandboxTerminalAiStoreFactory()
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
