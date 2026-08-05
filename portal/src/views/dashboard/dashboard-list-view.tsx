import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ResourceIcon } from '../common/resource-icon';

export interface DashboardListViewProps<T> {
  items: T[];
  emptyMessage: string;
  getItemKey(item: T): string;
  getItemTitle(item: T): ReactNode;
  getItemDescription?(item: T): ReactNode;
  getItemMeta?(item: T): ReactNode;
  getItemBadge?(item: T): ReactNode;
  getItemHref?(item: T): string;
}

export function DashboardListView<T>(props: DashboardListViewProps<T>) {
  if (props.items.length === 0) {
    return (
      <div className="flex min-h-40 items-center justify-center px-4 py-8 text-center text-sm text-slate-500">{props.emptyMessage}</div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {props.items.map(item => {
        const content = (
          <div className="flex min-w-0 items-start gap-3 px-4 py-3">
            {props.getItemBadge ? (
              <ResourceIcon size="md" className="mt-0.5">
                {props.getItemBadge(item)}
              </ResourceIcon>
            ) : null}

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-baseline justify-between gap-3">
                <div className="truncate text-sm font-medium text-slate-900">{props.getItemTitle(item)}</div>
                {props.getItemMeta ? <div className="shrink-0 text-xs text-slate-500">{props.getItemMeta(item)}</div> : null}
              </div>
              {props.getItemDescription ? (
                <div className="mt-0.5 truncate text-sm text-slate-500">{props.getItemDescription(item)}</div>
              ) : null}
            </div>
          </div>
        );
        const href = props.getItemHref?.(item);

        return (
          <li key={props.getItemKey(item)}>
            {href ? (
              <Link to={href} className="block transition-colors hover:bg-slate-50">
                {content}
              </Link>
            ) : (
              content
            )}
          </li>
        );
      })}
    </ul>
  );
}
