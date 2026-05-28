import { useIsAuthenticated } from '../auth/auth-context';
import { Link } from 'react-router-dom';

export function AuthGate(props: { route: React.ReactNode }) {
  const is = useIsAuthenticated();
  if (!is) {
    return (
      <>
        <h1>Not authenticated</h1>
        <div>
          <Link to={'/login'}>Login</Link>
        </div>
      </>
    );
  }
  return props.route;
}
