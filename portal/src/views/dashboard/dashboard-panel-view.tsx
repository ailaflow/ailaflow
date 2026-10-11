import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { SvgIcon, type SvgIconName } from '../common/svg-icons';

export interface DashboardPanelViewProps {
  title: string;
  icon: SvgIconName;
  children: ReactNode;
  variant?: 'default' | 'dashboard';
  className?: string;
  scrollable?: boolean;
  action?: {
    label: string;
    href: string;
  };
}

const VARIANT_CLASS_NAMES = {
  default: '',
  dashboard: 'max-h-80 min-h-56 lg:max-h-none lg:min-h-0'
} as const;

export function DashboardPanelView(props: DashboardPanelViewProps) {
  const variant = props.variant ?? 'default';

  return (
    <section
      className={`flex min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm ${VARIANT_CLASS_NAMES[variant]} ${props.className ?? ''}`}
    >
      <header className="flex min-h-13 shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold text-slate-900">
          <SvgIcon name={props.icon} className="h-5 w-5 shrink-0 text-slate-500" />
          <span className="truncate">{props.title}</span>
        </h2>

        {props.action ? (
          <Link to={props.action.href} className="shrink-0 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
            {props.action.label}
          </Link>
        ) : null}
      </header>

      <div className={`min-h-0 flex-1${props.scrollable ? ' overflow-y-auto' : ''}`}>{props.children}</div>
    </section>
  );
}
