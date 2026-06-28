import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface ResourceListColumn<T> {
  id: string;
  title: string;
  width?: string;
  align?: 'left' | 'right';
  leadingBadge?: string;
  getValue(item: T): ReactNode;
}

export interface ResourceListAction<T> {
  label: string | ReactNode;
  ariaLabel?: string;
  getTo(item: T): string;
}

export interface ResourceListViewProps<T> {
  title: string;
  createNewLabel?: string;
  onCreateNewClicked?(): void | Promise<void>;
  columns: ResourceListColumn<T>[];
  rows: T[];
  getRowKey(item: T): string;
  emptyMessage: string;
  actions?: ResourceListAction<T>[];
}

export function ResourceListView<T>(props: ResourceListViewProps<T>) {
  const nColumns = props.columns.length + (props.actions && props.actions.length > 0 ? 1 : 0);

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{props.title}</h1>
          </div>

          {props.createNewLabel && props.onCreateNewClicked ? (
            <button
              type="button"
              onClick={() => void props.onCreateNewClicked?.()}
              className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              {props.createNewLabel}
            </button>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-5">
        <div className="overflow-hidden rounded-md border border-slate-200">
          <table className="min-w-full table-fixed divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                {props.columns.map(column => (
                  <th
                    key={column.id}
                    scope="col"
                    style={{ width: column.width }}
                    className={`px-3 py-2.5 font-semibold text-slate-600 ${column.align === 'right' ? 'text-right' : ''}`}
                  >
                    {column.title}
                  </th>
                ))}
                {props.actions && props.actions.length > 0 ? (
                  <th scope="col" className="w-[18%] px-3 py-2.5 text-right font-semibold text-slate-600">
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
                        className={`truncate px-3 py-3 ${column.align === 'right' ? 'text-right' : ''} ${
                          column.id === 'name' ? 'font-medium text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        {column.leadingBadge ? (
                          <span className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded border border-slate-300 text-[10px] font-semibold text-slate-600">
                            {column.leadingBadge}
                          </span>
                        ) : null}
                        {column.getValue(row)}
                      </td>
                    ))}
                    {props.actions && props.actions.length > 0 ? (
                      <td className="px-3 py-3">
                        <div className="flex flex-nowrap justify-end gap-2">
                          {props.actions.map((action, i) => (
                            <Link
                              key={i}
                              aria-label={action.ariaLabel}
                              className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                              to={action.getTo(row)}
                            >
                              {action.label}
                            </Link>
                          ))}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
