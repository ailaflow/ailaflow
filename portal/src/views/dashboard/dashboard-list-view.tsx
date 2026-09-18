import type { ReactNode } from 'react';
import { ResourceIcon } from '../common/resource-icon';

interface DashboardListItemAction {
  label: ReactNode;
  ariaLabel?: string;
  onClick(): void | Promise<void>;
}

export interface DashboardListItem {
  key: string;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  badge?: ReactNode;
  action?: DashboardListItemAction;
}

export interface DashboardListViewProps {
  items: DashboardListItem[];
  emptyMessage: string;
}

export function DashboardListView(props: DashboardListViewProps) {
  if (props.items.length === 0) {
    return (
      <div className="flex min-h-40 items-center justify-center px-4 py-8 text-center text-sm text-slate-500">{props.emptyMessage}</div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {props.items.map(item => {
        return (
          <li key={item.key} className="transition-colors hover:bg-slate-50">
            <div className="flex min-w-0 items-center">
              <div className="flex min-w-0 flex-1 items-start gap-3 px-4 py-3">
                {item.badge ? (
                  <ResourceIcon size="md" className="mt-0.5">
                    {item.badge}
                  </ResourceIcon>
                ) : null}

                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-baseline justify-between gap-3">
                    <div className="truncate text-sm font-medium text-slate-900">{item.title}</div>
                    {item.meta ? <div className="shrink-0 text-xs text-slate-500">{item.meta}</div> : null}
                  </div>
                  {item.description ? <div className="mt-0.5 truncate text-sm text-slate-500">{item.description}</div> : null}
                </div>
              </div>
              {item.action ? (
                <div className="shrink-0 pr-4">
                  <button
                    type="button"
                    aria-label={item.action.ariaLabel}
                    className="inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                    onClick={() => void item.action?.onClick()}
                  >
                    {item.action.label}
                  </button>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
