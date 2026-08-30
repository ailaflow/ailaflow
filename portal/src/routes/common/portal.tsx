import { matchPath, useLocation } from 'react-router';
import {
  type CommandMenuItem,
  type LinkMenuItem,
  type MenuItem,
  PortalLayout
} from '../../views/portal/portal-layout';
import { useAuthState } from '../../auth/auth-context';

type LinkMenuItemDefinition = Omit<LinkMenuItem, 'isSelected'> & { activeAliases?: string[] };
type MenuItemDefinition = LinkMenuItemDefinition | CommandMenuItem;

const userItems: MenuItemDefinition[] = [
  { icon: 'C', label: 'My chat', action: 'link', href: '/my-chat' },
  { icon: '*', label: 'My configuration', action: 'link', href: '/my-configuration' },
  { icon: 'T', label: 'My tasks', action: 'link', href: '/my-tasks' },
  { icon: 'N', label: 'My notifications', action: 'link', href: '/my-notifications' },
  { icon: 'P', label: 'My processes', action: 'link', href: '/my-processes' },
  { icon: 'X', label: 'Log out', action: 'command', command: 'logout' }
];

const adminItems: MenuItemDefinition[] = [
  {
    icon: '/',
    label: 'Processes',
    action: 'link',
    href: '/admin/processes',
    activeAliases: ['/admin/create-process']
  },
  {
    icon: '#',
    label: 'Tables',
    action: 'link',
    href: '/admin/tables',
    activeAliases: ['/admin/create-table']
  },
  {
    icon: '@',
    label: 'Users',
    action: 'link',
    href: '/admin/users',
    activeAliases: ['/admin/create-user']
  },
  { icon: 'T', label: 'Tasks', action: 'link', href: '/admin/tasks' },
  {
    icon: '+',
    label: 'Sandboxes',
    action: 'link',
    href: '/admin/sandboxes',
    activeAliases: ['/admin/create-sandbox']
  },
  {
    icon: '*',
    label: 'Configuration',
    action: 'link',
    href: '/admin/configuration'
  }
];

export function Portal(props: { children: React.ReactNode }) {
  const { session, setSession } = useAuthState();
  const location = useLocation();
  const selectedUserItems = selectMenuItems(userItems, location.pathname);
  const selectedAdminItems = selectMenuItems(adminItems, location.pathname);

  function onCommand(command: string) {
    if (command === 'logout' && window.confirm('Are you sure you want to log out?')) {
      setSession(null);
    }
  }

  return (
    <PortalLayout
      userItems={selectedUserItems}
      adminItems={selectedAdminItems}
      userName={session!.userName}
      onCommand={onCommand}
    >
      {props.children}
    </PortalLayout>
  );
}

function selectMenuItems(items: MenuItemDefinition[], pathname: string): MenuItem[] {
  return items.map(item => {
    if (item.action === 'command') {
      return item;
    }
    const { activeAliases, ...menuItem } = item;
    return {
      ...menuItem,
      isSelected:
        Boolean(matchPath(`${item.href}/*`, pathname)) ||
        Boolean(activeAliases?.some(path => matchPath(path, pathname)))
    };
  });
}
