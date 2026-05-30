import { PortalLayout } from './portal-layout';
import { AdminContext } from './admin-context';

export interface AdminPortalLayoutProps {
  children: React.ReactNode;
  disableScroll?: true;
}

export function AdminPortalLayout(props: AdminPortalLayoutProps) {
  const sectionClassName = `min-h-0 bg-white${props.disableScroll ? '' : ' overflow-y-auto'}`;

  return (
    <PortalLayout>
      <AdminContext>
        <div className="flex h-full min-h-0 flex-col">
          <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,7fr)_minmax(0,3fr)] md:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] md:grid-rows-1">
            <section className={sectionClassName}>{props.children}</section>

            <aside className="min-h-0 overflow-y-auto border-t border-slate-200 bg-white md:border-l md:border-t-0">
              <div className="text-sm text-slate-500">Chat panel placeholder</div>
            </aside>
          </div>
        </div>
      </AdminContext>
    </PortalLayout>
  );
}
