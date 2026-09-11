export interface PaginationViewProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange(page: number): void;
}

export function PaginationView(props: PaginationViewProps) {
  const totalPages = Math.max(1, Math.ceil(props.totalCount / props.pageSize));

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <span>
        Page {props.page} of {totalPages} · {props.totalCount} {props.totalCount === 1 ? 'item' : 'items'}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={props.page <= 1}
          onClick={() => props.onPageChange(props.page - 1)}
          className="cursor-pointer inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous
        </button>
        <button
          type="button"
          disabled={props.page >= totalPages}
          onClick={() => props.onPageChange(props.page + 1)}
          className="cursor-pointer inline-flex h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-3 font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
