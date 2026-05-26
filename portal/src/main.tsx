import { createRoot } from 'react-dom/client';
import { ApiClientContext } from './auth/api-client-context';
import { AuthContext } from './auth/auth-context';
import { Router } from './routes/router';

createRoot(document.getElementById('root')!).render(
  <ApiClientContext>
    <AuthContext>
      <Router />
    </AuthContext>
  </ApiClientContext>
);
