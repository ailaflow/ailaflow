import { MenuItem, PortalLayout } from '../../views/portal/portal-layout';
import { useAuthState } from '../../auth/auth-context';

const userItems: MenuItem[] = [
  { icon: 'C', label: 'My chat', action: 'link', href: '/my-chat' },
  { icon: 'T', label: 'My tasks', action: 'link', href: '/my-tasks' },
  { icon: 'N', label: 'My notifications', action: 'link', href: '/my-notifications' },
  { icon: 'P', label: 'My processes', action: 'link', href: '/my-processes' },
  { icon: 'X', label: 'Log out', action: 'command', command: 'logout' }
];

const adminItems: MenuItem[] = [
  { icon: '/', label: 'Processes', action: 'link', href: '/admin/processes' },
  { icon: '#', label: 'Tables', action: 'link', href: '/admin/tables' },
  { icon: '@', label: 'Users', action: 'link', href: '/admin/users' },
  { icon: '*', label: 'Logs', action: 'link', href: '/admin/logs' },
  { icon: '+', label: 'Sandboxes', action: 'link', href: '/admin/sandboxes' },
  { icon: '*', label: 'Configuration', action: 'link', href: '/admin/configuration' }
];

export function Portal(props: { children: React.ReactNode }) {
  const { session, setSession } = useAuthState();

  function onCommand(command: string) {
    if (command === 'logout' && window.confirm('Are you sure you want to log out?')) {
      setSession(null);
    }
  }

  return (
    <PortalLayout userItems={userItems} adminItems={adminItems} userName={session!.userName} onCommand={onCommand}>
      {props.children}
    </PortalLayout>
  );
}
