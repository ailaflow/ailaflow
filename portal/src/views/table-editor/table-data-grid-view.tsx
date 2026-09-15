export interface TableDataGridColumn {
  id: string;
  label: string;
}

export interface TableDataGridRow {
  _id: string;
  values: Record<string, string>;
  _updatedAt: string;
}

export interface TableDataGridViewProps {
  columns: TableDataGridColumn[];
  rows: TableDataGridRow[];
  pagination: {
    page: number;
    hasMore: boolean;
    onPageChange(page: number): void;
  };
}

export function TableDataGridView(props: TableDataGridViewProps) {
  const nColumns = props.columns.length + 2;

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-max min-w-full border-separate border-spacing-0 text-left text-sm">
          <thead className="sticky top-0 z-20 bg-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <tr>
              <GridHeader className="sticky left-0 z-30 min-w-52 bg-slate-100">_id (STRING)</GridHeader>
              {props.columns.map(column => (
                <GridHeader key={column.id} className="min-w-48">
                  {column.label}
                </GridHeader>
              ))}
              <GridHeader className="min-w-48" isLast>
                _updatedAt (NUMBER)
              </GridHeader>
            </tr>
          </thead>
          <tbody className="font-mono text-xs text-slate-700">
            {props.rows.length === 0 ? (
              <tr>
                <td colSpan={nColumns} className="h-28 border-b border-slate-200 px-4 text-center font-sans text-sm text-slate-500">
                  No data found.
                </td>
              </tr>
            ) : (
              props.rows.map(row => (
                <tr key={row._id} className="group">
                  <GridCell className="sticky left-0 z-10 max-w-72 bg-white font-semibold text-slate-900 group-hover:bg-blue-50">
                    {row._id}
                  </GridCell>
                  {props.columns.map(column => (
                    <GridCell key={column.id}>{row.values[column.id]}</GridCell>
                  ))}
                  <GridCell className="font-sans text-xs text-slate-500" isLast>
                    {row._updatedAt}
                  </GridCell>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <span>Page {props.pagination.page}</span>
        <div className="flex gap-2">
          <PaginationButton disabled={props.pagination.page <= 1} onClick={() => props.pagination.onPageChange(props.pagination.page - 1)}>
            Previous
          </PaginationButton>
          <PaginationButton disabled={!props.pagination.hasMore} onClick={() => props.pagination.onPageChange(props.pagination.page + 1)}>
            Next
          </PaginationButton>
        </div>
      </div>
    </div>
  );
}

function GridHeader(props: { className?: string; children: React.ReactNode; isLast?: boolean }) {
  return (
    <th className={`h-9 border-b border-slate-300 px-3 ${props.isLast ? '' : 'border-r'} ${props.className ?? ''}`}>{props.children}</th>
  );
}

function GridCell(props: { className?: string; children?: React.ReactNode; isLast?: boolean }) {
  const text = typeof props.children === 'string' ? props.children : '';
  return (
    <td
      title={text}
      className={`h-9 max-w-96 truncate border-b border-slate-200 px-3 group-hover:bg-blue-50 ${props.isLast ? '' : 'border-r'} ${props.className ?? ''}`}
    >
      {props.children}
    </td>
  );
}

function PaginationButton(props: { disabled: boolean; onClick(): void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className="cursor-pointer inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {props.children}
    </button>
  );
}
