import type { ReactNode } from 'react';

interface DashboardListItemAction {
  label: ReactNode;
  ariaLabel?: string;
  onClick(): void | Promise<void>;
}

export interface DashboardListItem {
  key: string;
  title: ReactNode;
  createdAt?: number;
  action?: DashboardListItemAction;
  ariaLabel?: string;
  onClick?(): void | Promise<void>;
}

export interface DashboardListViewProps<T extends DashboardListItem> {
  items: T[];
  emptyMessage: string;
  getLeadingVisual?(item: T): ReactNode;
}

export function DashboardListView<T extends DashboardListItem>(props: DashboardListViewProps<T>) {
  if (props.items.length === 0) {
    return (
      <div className="flex min-h-40 items-center justify-center px-4 py-8 text-center text-sm text-slate-500">{props.emptyMessage}</div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {props.items.map(item => {
        const content = (
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                {props.getLeadingVisual?.(item)}
                <div className="min-w-0 whitespace-pre-wrap break-words text-sm font-medium text-slate-900">{item.title}</div>
              </div>
            </div>
            {item.createdAt !== undefined ? (
              <time dateTime={new Date(item.createdAt).toISOString()} className="shrink-0 text-xs text-slate-500">
                {formatDateTime(item.createdAt)}
              </time>
            ) : null}
          </div>
        );

        return (
          <li key={item.key} className="flex min-w-0 items-center transition-colors hover:bg-slate-50">
            {item.onClick ? (
              <button
                type="button"
                aria-label={item.ariaLabel}
                className="flex min-w-0 flex-1 cursor-pointer items-start px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                onClick={() => void item.onClick?.()}
              >
                {content}
              </button>
            ) : (
              <div className="flex min-w-0 flex-1 items-start px-4 py-3">{content}</div>
            )}
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
          </li>
        );
      })}
    </ul>
  );
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}
