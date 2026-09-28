import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PaginationView, type PaginationViewProps } from '../common/pagination-view';
import { ResourceItemMenuView, type ResourceItemAction } from './resource-item-menu-view';

export interface ResourceListColumn<T> {
  id: string;
  title: string;
  width?: string;
  align?: 'left' | 'right';
  wrap?: boolean;
  disabled?(item: T): string | undefined;
  getLeadingVisual?(item: T): ReactNode;
  getValue(item: T): ReactNode;
}

export interface ResourceListPrimaryAction<T> {
  icon: ReactNode;
  ariaLabel: string;
  isVisible?(item: T): boolean;
  getTo?(item: T): string;
  onClick?(item: T): void | Promise<void>;
}

export type ResourceListAction<T> = ResourceItemAction<T>;

export interface ResourceListViewProps<T> {
  title: string;
  headerActions?: ReactNode;
  columns: ResourceListColumn<T>[];
  rows: T[];
  getRowKey(item: T): string;
  emptyMessage: string;
  primaryAction?: ResourceListPrimaryAction<T>;
  actions?: ResourceListAction<T>[];
  pagination?: PaginationViewProps;
}

function ResourceListCellContent<T>(props: { column: ResourceListColumn<T>; row: T }) {
  const disabled = props.column.disabled?.(props.row);
  const value = props.column.getValue(props.row);
  const content = disabled ? (
    <span className="text-gray-400">
      {value} <small>({disabled})</small>
    </span>
  ) : (
    value
  );

  if (props.column.getLeadingVisual) {
    return (
      <div className={`flex min-w-0 items-center gap-2 ${props.column.align === 'right' ? 'justify-end' : ''}`}>
        {props.column.getLeadingVisual(props.row)}
        <span className={props.column.wrap ? 'whitespace-pre-wrap break-words' : 'min-w-0 truncate'}>{content}</span>
      </div>
    );
  }

  return content;
}

export function ResourceListView<T>(props: ResourceListViewProps<T>) {
  const hasActionColumn = Boolean(props.primaryAction || (props.actions && props.actions.length > 0));
  const nColumns = props.columns.length + (hasActionColumn ? 1 : 0);

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
        <div className="flex flex-col gap-5">
          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{props.title}</h1>

            {props.headerActions ? <div className="flex items-center gap-3">{props.headerActions}</div> : null}
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full table-fixed text-left text-sm">
                <thead className="border-b border-slate-100 bg-white">
                  <tr>
                    {props.columns.map(column => (
                      <th
                        key={column.id}
                        scope="col"
                        style={{ width: column.width }}
                        className={`px-3 py-3.5 font-semibold text-slate-600 ${column.align === 'right' ? 'text-right' : ''}`}
                      >
                        {column.title}
                      </th>
                    ))}
                    {hasActionColumn ? (
                      <th scope="col" className="w-24 px-3 py-3.5 text-right font-semibold text-slate-600">
                        Actions
                      </th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {props.rows.length === 0 ? (
                    <tr>
                      <td colSpan={nColumns} className="px-3 py-8 text-center text-sm text-slate-500">
                        {props.emptyMessage}
                      </td>
                    </tr>
                  ) : (
                    props.rows.map(row => (
                      <tr key={props.getRowKey(row)} className="transition-colors hover:bg-slate-50">
                        {props.columns.map(column => (
                          <td
                            key={column.id}
                            className={`px-3 py-3 ${column.wrap ? 'whitespace-pre-wrap break-words' : 'truncate'} ${
                              column.align === 'right' ? 'text-right' : ''
                            } ${column.id === 'name' ? 'font-medium text-slate-900' : 'text-slate-600'}`}
                          >
                            <ResourceListCellContent column={column} row={row} />
                          </td>
                        ))}
                        {hasActionColumn ? (
                          <td className="px-3 py-3">
                            <div className="flex flex-nowrap justify-end gap-2">
                              <ResourceListPrimaryActionView action={props.primaryAction} row={row} />
                              {props.actions ? (
                                <ResourceItemMenuView
                                  item={row}
                                  actions={props.actions}
                                  ariaLabel={`More actions for ${props.getRowKey(row)}`}
                                />
                              ) : null}
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {props.pagination ? <PaginationView {...props.pagination} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ResourceListPrimaryActionView<T>(props: { action?: ResourceListPrimaryAction<T>; row: T }) {
  const action = props.action;
  if (!action || (action.isVisible && !action.isVisible(props.row))) {
    return null;
  }

  const className =
    'inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-slate-500';

  if (action.getTo) {
    return (
      <Link aria-label={action.ariaLabel} className={className} to={action.getTo(props.row)}>
        {action.icon}
      </Link>
    );
  }

  return (
    <button type="button" aria-label={action.ariaLabel} className={className} onClick={() => void action.onClick?.(props.row)}>
      {action.icon}
    </button>
  );
}
