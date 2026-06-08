import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Login } from './login/login';
import { AuthGate } from './common/auth-gate';
import { Dashboard } from './dashboard/dashboard';
import { Install } from './install/install';
import { ProcessList } from './process-list/process-list';
import { ProcessEditor } from './process-editor/process-editor';
import { ProcessTester } from './process-tester/process-tester';
import { ContainerList } from './container-list/container-list';
import { ContainerEditor } from './container-editor/container-editor';
import { AdminPortal } from './common/admin-portal';

const router = createBrowserRouter([
  {
    path: '/',
    element: <AuthGate route={<Dashboard />} />
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/install',
    element: <Install />
  },
  {
    path: '/admin',
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
        path: '/admin/containers',
        element: <ContainerList />
      },
      {
        path: '/admin/create-container',
        element: <ContainerEditor />
      },
      {
        path: '/admin/containers/:name',
        element: <ContainerEditor />
      }
    ]
  }
]);

export function Router() {
  return <RouterProvider router={router} />;
}
