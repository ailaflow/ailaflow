import { BrowserRouter, Outlet, useRoutes } from 'react-router';
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
import { MyProcessPage } from './my-process/my-process-page';
import { MyNotificationsPage } from './my-notifications/my-notifications-page';
import { MyTasksPage } from './my-tasks/my-tasks-page';
import { MyTaskPage } from './my-task/my-task-page';
import { UserListPage } from './user-list/user-list-page';
import { UserEditorPage } from './user-editor/user-editor-page';
import { UserTelegramConfigurationPage } from './user-telegram-configuration/user-telegram-configuration-page';
import { TableListPage } from './table-list/table-list-page';
import { TableEditorPage } from './table-editor/table-editor-page';
import { ConfigurationPage } from './configuration/configuration-page';
import { TaskListPage } from './task-list/task-list-page';
import { ProcessCronJobsPage } from './process-cron-jobs/process-cron-jobs-page';
import { NotFoundPage } from './not-found/not-found-page';
import { MagicLinkPage } from './magic-link/magic-link';
import { Portal } from './common/portal';
import { ProcessExecutionTracesPage } from './process-execution-traces/process-execution-traces-page';
import { ProcessExecutionTraceEventsPage } from './process-execution-trace-events/process-execution-trace-events-page';

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
    path: '/magic-link',
    element: <MagicLinkPage />
  },
  {
    element: <AuthGate route={<Portal />} />,
    children: [
      {
        path: '/',
        element: <DashboardPage />
      },
      {
        path: '/my-chat/:channelName',
        element: <MyChatPage />
      },
      {
        path: '/my-configuration',
        element: <MyConfigurationPage />
      },
      {
        path: '/my-tasks',
        element: <MyTasksPage />
      },
      {
        path: '/my-tasks/:taskId',
        element: <MyTaskPage />
      },
      {
        path: '/my-notifications',
        element: <MyNotificationsPage />
      },
      {
        path: '/my-processes',
        element: <MyProcessListPage />
      },
      {
        path: '/my-processes/:name',
        element: <MyProcessPage />
      },
      {
        element: <AdminPortal />,
        children: [
          {
            path: '/admin/processes',
            element: <ProcessListPage />
          },
          {
            path: '/admin/process-execution-traces',
            element: <ProcessExecutionTracesPage />
          },
          {
            path: '/admin/process-execution-traces/:executionId',
            element: <ProcessExecutionTraceEventsPage />
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
      }
    ]
  },

  {
    path: '*',
    element: <NotFoundPage />
  }
];

function RouteElements() {
  return useRoutes(routes);
}

export function Router() {
  return (
    <BrowserRouter>
      <RouteElements />
    </BrowserRouter>
  );
}
