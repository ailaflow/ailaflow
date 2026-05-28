import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Login } from './login/login';
import { AuthGate } from './auth-gate';
import { Dashboard } from './dashboard/dashboard';
import { Install } from './install/install';

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
  }
]);

export function Router() {
  return <RouterProvider router={router} />;
}
