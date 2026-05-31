import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Login } from './login/login';
import { AuthGate } from './auth-gate';
import { Dashboard } from './dashboard/dashboard';
import { Install } from './install/install';
import { ProcessList } from './process-list/process-list';
import { ProcessEditor } from './process-editor/process-editor';

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
  }
]);

export function Router() {
  return <RouterProvider router={router} />;
}
