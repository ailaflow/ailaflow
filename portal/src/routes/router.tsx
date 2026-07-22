import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Login } from './login/login';
import { AuthGate } from './common/auth-gate';
import { Dashboard } from './dashboard/dashboard';
import { Install } from './install/install';
import { ProcessList } from './process-list/process-list';
import { ProcessEditorPage } from './process-editor/process-editor-page';
import { ProcessTesterPage } from './process-tester/process-tester-page';
import { SandboxList } from './sandbox-list/sandbox-list';
import { SandboxEditorPage } from './sandbox-editor/sandbox-editor-page';
import { AdminPortal } from './common/admin-portal';
import { MyChat } from './my-chat/my-chat';
import { MyProcessList } from './my-process-list/my-process-list';
import { MyNotificationsPage } from './my-notifications/my-notifications-page';
import { MyTasksPage } from './my-tasks/my-tasks-page';
import { MyViewsPage } from './my-views/my-views-page';
import { UserList } from './user-list/user-list';
import { UserEditorPage } from './user-editor/user-editor-page';
import { TableListPage } from './table-list/table-list-page';
import { ViewListPage } from './view-list/view-list-page';
import { LogsPage } from './logs/logs-page';
import { ConfigurationPage } from './configuration/configuration-page';

export const routes = [
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/install',
    element: <Install />
  },
  {
    path: '/',
    element: <AuthGate route={<Dashboard />} />
  },
  {
    path: '/my-chat',
    element: <AuthGate route={<MyChat />} />
  },
  {
    path: '/my-tasks',
    element: <AuthGate route={<MyTasksPage />} />
  },
  {
    path: '/my-notifications',
    element: <AuthGate route={<MyNotificationsPage />} />
  },
  {
    path: '/my-processes',
    element: <AuthGate route={<MyProcessList />} />
  },
  {
    path: '/my-views',
    element: <AuthGate route={<MyViewsPage />} />
  },
  {
    element: <AuthGate route={<AdminPortal />} />,
    children: [
      {
        path: '/admin/processes',
        element: <ProcessList />
      },
      {
        path: '/admin/processes/:processName',
        element: <ProcessEditorPage />
      },
      {
        path: '/admin/create-process',
        element: <ProcessEditorPage />
      },
      {
        path: '/admin/processes/:processName/test',
        element: <ProcessTesterPage />
      },
      {
        path: '/admin/tables',
        element: <TableListPage />
      },
      {
        path: '/admin/sandboxes',
        element: <SandboxList />
      },
      {
        path: '/admin/create-sandbox',
        element: <SandboxEditorPage />
      },
      {
        path: '/admin/sandboxes/:name',
        element: <SandboxEditorPage />
      },
      {
        path: '/admin/users',
        element: <UserList />
      },
      {
        path: '/admin/create-user',
        element: <UserEditorPage />
      },
      {
        path: '/admin/users/:userName',
        element: <UserEditorPage />
      },
      {
        path: '/admin/views',
        element: <ViewListPage />
      },
      {
        path: '/admin/logs',
        element: <LogsPage />
      },
      {
        path: '/admin/configuration',
        element: <ConfigurationPage />
      }
    ]
  }
];

const router = createBrowserRouter(routes);

export function Router() {
  return <RouterProvider router={router} />;
}
