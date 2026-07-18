import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Login } from './login/login';
import { AuthGate } from './common/auth-gate';
import { Dashboard } from './dashboard/dashboard';
import { Install } from './install/install';
import { ProcessList } from './process-list/process-list';
import { ProcessEditor } from './process-editor/process-editor';
import { ProcessTester } from './process-tester/process-tester';
import { SandboxList } from './sandbox-list/sandbox-list';
import { SandboxEditor } from './sandbox-editor/sandbox-editor';
import { AdminPortal } from './common/admin-portal';
import { MyChat } from './my-chat/my-chat';
import { UserList } from './user-list/user-list';
import { UserEditor } from './user-editor/user-editor';

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
    element: <AuthGate route={<AdminPortal />} />,
    children: [
      {
        path: '/admin/processes',
        element: <ProcessList />
      },
      {
        path: '/admin/processes/:processId',
        element: <ProcessEditor />
      },
      {
        path: '/admin/create-process',
        element: <ProcessEditor />
      },
      {
        path: '/admin/processes/:processId/test',
        element: <ProcessTester />
      },
      {
        path: '/admin/sandboxes',
        element: <SandboxList />
      },
      {
        path: '/admin/create-sandbox',
        element: <SandboxEditor />
      },
      {
        path: '/admin/sandboxes/:name',
        element: <SandboxEditor />
      },
      {
        path: '/admin/users',
        element: <UserList />
      },
      {
        path: '/admin/users/:userId',
        element: <UserEditor />
      }
    ]
  }
];

const router = createBrowserRouter(routes);

export function Router() {
  return <RouterProvider router={router} />;
}
