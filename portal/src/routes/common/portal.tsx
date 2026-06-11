import { MenuItem, PortalLayout } from '../../views/portal/portal-layout';
import { useAuthState } from '../../auth/auth-context';

const userItems: MenuItem[] = [
  { icon: 'T', label: 'My tasks', action: 'link', href: '#' },
  { icon: 'N', label: 'My notifications', action: 'link', href: '#' },
  { icon: 'P', label: 'My processes', action: 'link', href: '#' },
  { icon: 'V', label: 'My views', action: 'link', href: '#' },
  { icon: 'X', label: 'Log out', action: 'command', command: 'logout' }
];

const adminItems: MenuItem[] = [
  { icon: '/', label: 'Processes', action: 'link', href: '/admin/processes' },
  { icon: '#', label: 'Tables', action: 'link', href: '#' },
  { icon: '#', label: 'Users', action: 'link', href: '#' },
  { icon: '*', label: 'Views', action: 'link', href: '#' },
  { icon: '*', label: 'Logs', action: 'link', href: '#' },
  { icon: '*', label: 'Configuration', action: 'link', href: '#' },
  { icon: '+', label: 'Sandboxes', action: 'link', href: '/admin/sandboxes' }
];

export function Portal(props: { children: React.ReactNode }) {
  const { session, setSession } = useAuthState();

  function onCommand(command: string) {
    if (command === 'logout') {
      setSession(null);
    }
  }

  return (
    <PortalLayout userItems={userItems} adminItems={adminItems} userName={session!.userName} onCommand={onCommand}>
      {props.children}
    </PortalLayout>
  );
}
