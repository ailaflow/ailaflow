import { matchPath, useLocation } from 'react-router';
import { type CommandMenuItem, type LinkMenuItem, type MenuItem, PortalLayout } from '../../views/portal/portal-layout';
import { useAuthState } from '../../auth/auth-context';
import { useEffect, useState } from 'react';
import { LicenseWarningPopup } from './popups/license-warning-popup';

type LinkMenuItemDefinition = Omit<LinkMenuItem, 'isSelected'> & { activeAliases?: string[] };
type MenuItemDefinition = LinkMenuItemDefinition | CommandMenuItem;

const userItems: MenuItemDefinition[] = [
  { label: 'My chat', action: 'link', href: '/my-chat' },
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

export function Portal(props: { children: React.ReactNode }) {
  const { session, setSession, apiClient } = useAuthState();
  if (!session) {
    throw new Error('No session available');
  }

  const location = useLocation();
  const [licenseValidationError, setLicenseValidationError] = useState<string | null>(null);
  const selectedUserItems = selectMenuItems(userItems, location.pathname);
  const selectedAdminItems = session.isAdmin ? selectMenuItems(adminItems, location.pathname) : null;

  useEffect(() => {
    const abortController = new AbortController();

    async function check() {
      try {
        const response = await apiClient.licenseConfiguration.getStatus(abortController.signal);
        if (response.validationError) {
          setLicenseValidationError(response.validationError);
        }
      } catch (e) {}
    }

    void check();
    return () => abortController.abort();
  }, [apiClient]);

  function onCommand(command: string) {
    if (command === 'logout' && window.confirm('Are you sure you want to log out?')) {
      setSession(null);
    }
  }

  return (
    <>
      <PortalLayout userItems={selectedUserItems} adminItems={selectedAdminItems} userName={session.userName} onCommand={onCommand}>
        {props.children}
      </PortalLayout>
      {licenseValidationError && <LicenseWarningPopup error={licenseValidationError} onClose={() => setLicenseValidationError(null)} />}
    </>
  );
}
