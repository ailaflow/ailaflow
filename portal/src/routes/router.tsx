import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Login } from './login/login';
import { AuthGate } from './common/auth-gate';
import { Dashboard } from './dashboard/dashboard';
import { Install } from './install/install';
import { ProcessList } from './process-list/process-list';
import { ProcessEditor } from './process-editor/process-editor';
import { ProcessTester } from './process-tester/process-tester';
import { SandboxList } from './sandbox-list/sandbox-list';
import { SandboxEditorPage } from './sandbox-editor/sandbox-editor-page';
import { AdminPortal } from './common/admin-portal';
import { MyChat } from './my-chat/my-chat';
import { MyProcessList } from './my-process-list/my-process-list';
import { UserList } from './user-list/user-list';
import { UserEditorPage } from './user-editor/user-editor-page';

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
    path: '/my-processes',
    element: <AuthGate route={<MyProcessList />} />
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
        element: <ProcessEditor />
      },
      {
        path: '/admin/create-process',
        element: <ProcessEditor />
      },
      {
        path: '/admin/processes/:processName/test',
        element: <ProcessTester />
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
      }
    ]
  }
];

const router = createBrowserRouter(routes);

export function Router() {
  return <RouterProvider router={router} />;
}
