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
    path: '/admin/processes',
    element: <AuthGate route={<ProcessList />} />
  },
  {
    path: '/admin/processes/:processId',
    element: <AuthGate route={<ProcessEditor />} />
  },
  {
    path: '/admin/create-process',
    element: <AuthGate route={<ProcessEditor />} />
  },
  {
    path: '/admin/processes/:processId/test',
    element: <AuthGate route={<ProcessTester />} />
  },
  {
    path: '/admin/containers',
    element: <AuthGate route={<ContainerList />} />
  },
  {
    path: '/admin/create-container',
    element: <AuthGate route={<ContainerEditor />} />
  },
  {
    path: '/admin/containers/:name',
    element: <AuthGate route={<ContainerEditor />} />
  }
]);

export function Router() {
  return <RouterProvider router={router} />;
}
