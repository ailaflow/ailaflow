import { createRoot } from 'react-dom/client';
import { AuthContext } from './auth/auth-context';
import { Router } from './routes/router';

createRoot(document.getElementById('root')!).render(
  <AuthContext>
    <Router />
  </AuthContext>
);
