import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AilaFlowLogo } from '../common/aila-flow-logo';

export type LinkMenuItem = {
  label: string;
  action: 'link';
  href: string;
  isSelected: boolean;
};

export type CommandMenuItem = {
  label: string;
  action: 'command';
  command: string;
};

export type MenuItem = LinkMenuItem | CommandMenuItem;

function MenuItemView(props: { item: MenuItem; onCommand(command: string): void; onSelect?: () => void }) {
  const { item } = props;
  const isSelected = item.action === 'link' && item.isSelected;
  const itemClassName = `flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors ${
    isSelected ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-700 hover:bg-slate-100'
  }`;
  const content = <span className="truncate">{item.label}</span>;

  if (item.action === 'link') {
    return (
      <Link to={item.href} className={itemClassName} aria-current={item.isSelected ? 'page' : undefined} onClick={props.onSelect}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        props.onCommand(item.command);
        props.onSelect?.();
      }}
      className={itemClassName}
    >
      {content}
    </button>
  );
}

export interface PortalLayoutProps {
  children: React.ReactNode;
  userName: string;
  userItems: MenuItem[];
  adminItems: MenuItem[] | null;
  onCommand(command: string): void;
}

export function PortalLayout(props: PortalLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  function closeSidebar() {
    setIsSidebarOpen(false);
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-white text-slate-900">
      <div className="flex h-full w-full min-h-0">
        {isSidebarOpen && (
          <button
            type="button"
            aria-label="Close navigation menu"
            className="cursor-pointer fixed inset-0 z-30 bg-slate-900/20 md:hidden"
            onClick={closeSidebar}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 w-42.5 shrink-0 border-r border-slate-200 bg-white px-2 py-5 transition-transform duration-200 md:static md:z-auto md:w-37.5 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 pt-1 pb-5">
              <Link to="/" onClick={closeSidebar} className="block transition-opacity hover:opacity-80">
                <AilaFlowLogo className="mx-auto h-18 w-18 object-contain" />
              </Link>
            </div>

            <div className="mt-4 px-2 text-xs font-semibold tracking-wide text-slate-500">@{props.userName}</div>

            <div className="text-sm">
              <nav className="mt-4 flex flex-col gap-1.5">
                {props.userItems.map(item => (
                  <MenuItemView key={item.label} item={item} onCommand={props.onCommand} onSelect={closeSidebar} />
                ))}
              </nav>

              {props.adminItems && (
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <div className="mb-2.5 px-2 text-xs font-semibold tracking-wide text-slate-500">Admin</div>
                  <nav className="flex flex-col gap-1.5">
                    {props.adminItems.map(item => (
                      <MenuItemView key={item.label} item={item} onCommand={props.onCommand} onSelect={closeSidebar} />
                    ))}
                  </nav>
                </div>
              )}
            </div>
          </div>
        </aside>

        <main className="min-h-0 min-w-0 flex-1 overflow-hidden bg-white">
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-slate-200 px-4 md:hidden">
              <Link to="/" aria-label="AilaFlow home">
                <AilaFlowLogo className="h-10 w-10 object-contain" />
              </Link>
              <button
                type="button"
                aria-label="Open navigation menu"
                className="cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100"
                onClick={() => setIsSidebarOpen(true)}
              >
                <span className="text-base leading-none">≡</span>
              </button>
            </div>

            <div className="min-h-0 flex-1">{props.children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
