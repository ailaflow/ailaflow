import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { PaginationView, type PaginationViewProps } from '../common/pagination-view';

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

export interface ResourceListAction<T> {
  label: ReactNode | ((item: T) => ReactNode);
  ariaLabel?: string | ((item: T) => string);
  isVisible?(item: T): boolean;
  getTo?(item: T): string;
  onClick?(item: T): void | Promise<void>;
  danger?: boolean;
}

export interface ResourceListViewProps<T> {
  title: string;
  headerActions?: ReactNode;
  columns: ResourceListColumn<T>[];
  rows: T[];
  getRowKey(item: T): string;
  emptyMessage: string;
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
  const nColumns = props.columns.length + (props.actions && props.actions.length > 0 ? 1 : 0);

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
                    {props.actions && props.actions.length > 0 ? (
                      <th scope="col" className="w-[18%] px-3 py-3.5 text-right font-semibold text-slate-600">
                        Action
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
                        {props.actions && props.actions.length > 0 ? (
                          <td className="px-3 py-3">
                            <div className="flex flex-nowrap justify-end gap-2">
                              {props.actions.map((action, i) => {
                                if (action.isVisible && !action.isVisible(row)) {
                                  return null;
                                }
                                const label = typeof action.label === 'function' ? action.label(row) : action.label;
                                const ariaLabel = typeof action.ariaLabel === 'function' ? action.ariaLabel(row) : action.ariaLabel;
                                const className = `inline-flex h-8 shrink-0 cursor-pointer items-center justify-center rounded-md border bg-white px-3 text-sm font-medium transition-colors ${
                                  action.danger
                                    ? 'border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800'
                                    : 'border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                }`;

                                return action.getTo ? (
                                  <Link key={i} aria-label={ariaLabel} className={className} to={action.getTo(row)}>
                                    {label}
                                  </Link>
                                ) : (
                                  <button
                                    key={i}
                                    type="button"
                                    aria-label={ariaLabel}
                                    className={className}
                                    onClick={() => void action.onClick?.(row)}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
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
