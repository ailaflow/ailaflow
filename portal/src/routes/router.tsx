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
import { SandboxTerminalPage } from './sandbox-terminal/sandbox-terminal-page';
import { AdminPortal } from './common/admin-portal';
import { MyChatPage } from './my-chat/my-chat-page';
import { MyConfigurationPage } from './my-configuration/my-configuration-page';
import { MyProcessListPage } from './my-process-list/my-process-list-page';
import { MyNotificationsPage } from './my-notifications/my-notifications-page';
import { MyTasksPage } from './my-tasks/my-tasks-page';
import { MyTaskPage } from './my-tasks/my-task-page';
import { UserListPage } from './user-list/user-list-page';
import { UserEditorPage } from './user-editor/user-editor-page';
import { UserTelegramConfigurationPage } from './user-telegram-configuration/user-telegram-configuration-page';
import { TableListPage } from './table-list/table-list-page';
import { TableEditorPage } from './table-editor/table-editor-page';
import { ConfigurationPage } from './configuration/configuration-page';
import { TaskListPage } from './task-list/task-list-page';
import { ProcessCronJobsPage } from './process-cron-jobs/process-cron-jobs-page';
import { NotFoundPage } from './not-found/not-found-page';

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
    path: '/my-tasks/:taskId',
    element: <AuthGate route={<MyTaskPage />} />
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
        path: '/admin/processes/:processName/cron-jobs',
        element: <ProcessCronJobsPage />
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
        path: '/admin/sandboxes/:name/terminal',
        element: <SandboxTerminalPage />
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
        path: '/admin/tasks',
        element: <TaskListPage />
      },
      {
        path: '/admin/configuration',
        element: <ConfigurationPage />
      }
    ]
  },
  {
    path: '*',
    element: <NotFoundPage />
  }
];

const router = createBrowserRouter(routes);

export function Router() {
  return <RouterProvider router={router} />;
}
