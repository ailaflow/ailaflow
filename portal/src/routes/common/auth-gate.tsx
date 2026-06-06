import { useIsAuthenticated } from '../../auth/auth-context';
import { CenteredFormLayout } from '../../views/centered-form/centered-form-layout';
import { UnauthenticatedView } from '../../views/centered-form/unauthenticated-view';

export function AuthGate(props: { route: React.ReactNode }) {
  const is = useIsAuthenticated();
  if (!is) {
    return (
      <CenteredFormLayout>
        <UnauthenticatedView />
      </CenteredFormLayout>
    );
  }
  return props.route;
}
