import { matchPath, Outlet, useLocation } from 'react-router';
import { type CommandMenuItem, type LinkMenuItem, type MenuItem, PortalLayout } from '../../views/portal/portal-layout';
import { useAuthState } from '../../auth/auth-context';
import { useEffect, useState } from 'react';
import { LicenseAlertPopup } from './popups/license-alert-popup';

type LinkMenuItemDefinition = Omit<LinkMenuItem, 'isSelected'> & { activeAliases?: string[] };
type MenuItemDefinition = LinkMenuItemDefinition | CommandMenuItem;

const userItems: MenuItemDefinition[] = [
  { label: 'My configuration', action: 'link', href: '/my-configuration' },
  { label: 'My tasks', action: 'link', href: '/my-tasks' },
  { label: 'My notifications', action: 'link', href: '/my-notifications' },
  { label: 'My processes', action: 'link', href: '/my-processes' },
  { label: 'Log out', action: 'command', command: 'logout' }
];

const adminItems: MenuItemDefinition[] = [
  {
    label: 'Processes',
    action: 'link',
    href: '/admin/processes',
    activeAliases: ['/admin/create-process']
  },
  {
    label: 'Tables',
    action: 'link',
    href: '/admin/tables',
    activeAliases: ['/admin/create-table']
  },
  {
    label: 'Users',
    action: 'link',
    href: '/admin/users',
    activeAliases: ['/admin/create-user']
  },
  { label: 'Tasks', action: 'link', href: '/admin/tasks' },
  {
    label: 'Sandboxes',
    action: 'link',
    href: '/admin/sandboxes',
    activeAliases: ['/admin/create-sandbox']
  },
  {
    label: 'Configuration',
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
  const [licenseValidationError, setLicenseValidationError] = useState<string | null>(null);

  const [chatItems, setChatItems] = useState<MenuItemDefinition[]>([]);
  const selectedChatItems = selectMenuItems(chatItems, location.pathname);
  const selectedUserItems = selectMenuItems(userItems, location.pathname);
  const selectedAdminItems = session.isAdmin ? selectMenuItems(adminItems, location.pathname) : null;

  useEffect(() => {
    const abortController = new AbortController();

    async function check() {
      const response = await apiClient.licenseConfiguration.getStatus(abortController.signal);
      if (response.validationError) {
        setLicenseValidationError(response.validationError);
      }
    }

    void check();
    return () => abortController.abort();
  }, [apiClient]);

  useEffect(() => {
    const abortController = new AbortController();

    async function fetchChannels() {
      const response = await apiClient.myConfiguration.getChannels(abortController.signal);
      setChatItems(
        response.channels.map(c => ({
          label: `${uppercaseFirst(c.name)} Chat`,
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

  function closeLicenseAlert() {
    setLicenseValidationError(null);
  }

  return (
    <>
      <PortalLayout
        chatItems={selectedChatItems}
        userItems={selectedUserItems}
        adminItems={selectedAdminItems}
        userName={session.userName}
        onCommand={onCommand}
      >
        <Outlet />
      </PortalLayout>
      {licenseValidationError && <LicenseAlertPopup error={licenseValidationError} onClose={closeLicenseAlert} />}
    </>
  );
}

function uppercaseFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
