import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { LoginPage } from './login/login-page';
import { AuthGate } from './common/auth-gate';
import { DashboardPage } from './dashboard/dashboard-page';
import { InstallPage } from './install/install-page';
import { ProcessListPage } from './process-list/process-list-page';
import { ProcessEditorPage } from './process-editor/process-editor-page';
import { ProcessTesterPage } from './process-tester/process-tester-page';
import { SandboxListPage } from './sandbox-list/sandbox-list-page';
import { SandboxEditorPage } from './sandbox-editor/sandbox-editor-page';
import { AdminPortal } from './common/admin-portal';
import { MyChatPage } from './my-chat/my-chat-page';
import { MyConfigurationPage } from './my-configuration/my-configuration-page';
import { MyProcessListPage } from './my-process-list/my-process-list-page';
import { MyNotificationsPage } from './my-notifications/my-notifications-page';
import { MyTasksPage } from './my-tasks/my-tasks-page';
import { UserListPage } from './user-list/user-list-page';
import { UserEditorPage } from './user-editor/user-editor-page';
import { UserTelegramConfigurationPage } from './user-telegram-configuration/user-telegram-configuration-page';
import { TableListPage } from './table-list/table-list-page';
import { TableEditorPage } from './table-editor/table-editor-page';
import { LogsPage } from './logs/logs-page';
import { ConfigurationPage } from './configuration/configuration-page';

export const routes = [
  {
    path: '/login',
    element: <LoginPage />
  },
  {
    path: '/install',
    element: <InstallPage />
  },
  {
    path: '/',
    element: <AuthGate route={<DashboardPage />} />
  },
  {
    path: '/my-chat',
    element: <AuthGate route={<MyChatPage />} />
  },
  {
    path: '/my-configuration',
    element: <AuthGate route={<MyConfigurationPage />} />
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
    element: <AuthGate route={<MyProcessListPage />} />
  },
  {
    element: <AuthGate route={<AdminPortal />} />,
    children: [
      {
        path: '/admin/processes',
        element: <ProcessListPage />
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
        path: '/admin/tables/:tableName',
        element: <TableEditorPage />
      },
      {
        path: '/admin/create-table',
        element: <TableEditorPage />
      },
      {
        path: '/admin/sandboxes',
        element: <SandboxListPage />
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
        element: <UserListPage />
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
        path: '/admin/users/:userName/telegram',
        element: <UserTelegramConfigurationPage />
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
