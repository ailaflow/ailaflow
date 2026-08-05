import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface DashboardPanelViewProps {
  title: string;
  children: ReactNode;
  action?: {
    label: string;
    href: string;
  };
}

export function DashboardPanelView(props: DashboardPanelViewProps) {
  return (
    <section className="flex min-h-56 min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex min-h-13 shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h2 className="truncate text-base font-semibold text-slate-900">{props.title}</h2>

        {props.action ? (
          <Link
            to={props.action.href}
            className="shrink-0 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            {props.action.label}
          </Link>
        ) : null}
      </header>

      <div className="min-h-0 flex-1">{props.children}</div>
    </section>
  );
}
