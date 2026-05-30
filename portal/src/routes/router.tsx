import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Login } from './login/login';
import { AuthGate } from './auth-gate';
import { Dashboard } from './dashboard/dashboard';
import { Install } from './install/install';
import { AdminProcesses } from './admin-processes/admin-processes';
import { AdminProcessEditor } from './admin-process-editor/admin-process-editor';

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
    element: <AuthGate route={<AdminProcesses />} />
  },
  {
    path: '/admin/processes/:processId',
    element: <AuthGate route={<AdminProcessEditor />} />
  },
  {
    path: '/admin/create-processes',
    element: <AuthGate route={<AdminProcessEditor />} />
  }
]);

export function Router() {
  return <RouterProvider router={router} />;
}
