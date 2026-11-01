import { matchPath, Outlet, useLocation } from 'react-router';
import { type CommandMenuItem, type LinkMenuItem, type MenuItem, PortalLayout } from '../../views/portal/portal-layout';
import { useAuthState } from '../../auth/auth-context';
import { useEffect, useState } from 'react';

type LinkMenuItemDefinition = Omit<LinkMenuItem, 'isSelected'> & { activeAliases?: string[] };
type MenuItemDefinition = LinkMenuItemDefinition | CommandMenuItem;

const userItems: MenuItemDefinition[] = [
  { label: 'Dashboard', icon: 'dashboard', action: 'link', href: '/' },
  { label: 'My processes', icon: 'processes', action: 'link', href: '/my-processes' },
  { label: 'My tasks', icon: 'timer', action: 'link', href: '/my-tasks' },
  { label: 'My notifications', icon: 'notification', action: 'link', href: '/my-notifications' },
  { label: 'My configuration', icon: 'configuration', action: 'link', href: '/my-configuration' },
  { label: 'Log out', icon: 'logout', action: 'command', command: 'logout' }
];

const adminItems: MenuItemDefinition[] = [
  {
    label: 'Processes',
    icon: 'processes',
    action: 'link',
    href: '/admin/processes',
    activeAliases: ['/admin/create-process']
  },
  {
    label: 'Traces',
    icon: 'traces',
    action: 'link',
    href: '/admin/process-execution-traces'
  },
  {
    label: 'Tables',
    icon: 'table',
    action: 'link',
    href: '/admin/tables',
    activeAliases: ['/admin/create-table']
  },
  {
    label: 'Users',
    icon: 'user',
    action: 'link',
    href: '/admin/users',
    activeAliases: ['/admin/create-user']
  },
  { label: 'Tasks', icon: 'timer', action: 'link', href: '/admin/tasks' },
  {
    label: 'Sandboxes',
    icon: 'sandbox',
    action: 'link',
    href: '/admin/sandboxes',
    activeAliases: ['/admin/create-sandbox']
  },
  {
    label: 'Configuration',
    icon: 'configuration',
    action: 'link',
    href: '/admin/configuration'
  }
];

function selectMenuItems(items: MenuItemDefinition[], pathname: string): MenuItem[] {
  return items.map(item => {
    if (item.action === 'command') {
      return item;
    }
    const { activeAliases, ...menuItem } = item;
    return {
      ...menuItem,
      isSelected: Boolean(matchPath(`${item.href}/*`, pathname)) || Boolean(activeAliases?.some(path => matchPath(path, pathname)))
    };
  });
}

export function Portal() {
  const { session, setSession, apiClient } = useAuthState();
  if (!session) {
    throw new Error('No session available');
  }

  const location = useLocation();
  const [chatItems, setChatItems] = useState<MenuItemDefinition[]>([]);
  const selectedChatItems = selectMenuItems(chatItems, location.pathname);
  const selectedUserItems = selectMenuItems(userItems, location.pathname);
  const selectedAdminItems = session.isAdmin ? selectMenuItems(adminItems, location.pathname) : null;

  useEffect(() => {
    const abortController = new AbortController();

    async function fetchChannels() {
      const response = await apiClient.myConfiguration.getChannels(abortController.signal);
      setChatItems(
        response.channels.map(c => ({
          label: `${uppercaseFirst(c.name)} Chat`,
          icon: 'chat',
          action: 'link',
          href: `/my-chat/${c.name}`
        }))
      );
    }

    if (session) {
      void fetchChannels();
      return () => abortController.abort();
    }
  }, [apiClient, session]);

  function onCommand(command: string) {
    if (command === 'logout' && window.confirm('Are you sure you want to log out?')) {
      setSession(null);
    }
  }

  return (
    <PortalLayout
      chatItems={selectedChatItems}
      userItems={selectedUserItems}
      adminItems={selectedAdminItems}
      userName={session.userName}
      onCommand={onCommand}
    >
      <Outlet />
    </PortalLayout>
  );
}

function uppercaseFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
