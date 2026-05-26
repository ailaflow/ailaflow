import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Login } from './login/login';

const router = createBrowserRouter([
  {
    path: '/',
    element: <div />
  },
  {
    path: '/login',
    element: <Login />
  }
]);

export function Router() {
  return <RouterProvider router={router} />;
}
