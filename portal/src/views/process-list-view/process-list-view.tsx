import { PaginationView, type PaginationViewProps } from '../common/pagination-view';
import { ProcessIconGridView, type ProcessIconGridItem } from '../common/process-icon-grid-view';

export interface ProcessListViewProps {
  title: string;
  items: ProcessIconGridItem[];
  emptyMessage: string;
  pagination: PaginationViewProps;
}

export function ProcessListView(props: ProcessListViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
        <div className="flex flex-col gap-5">
          <h1 className="shrink-0 text-3xl font-semibold tracking-tight text-slate-900">{props.title}</h1>

          <section aria-label={props.title} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <ProcessIconGridView items={props.items} emptyMessage={props.emptyMessage} />
            <PaginationView {...props.pagination} />
          </section>
        </div>
      </div>
    </div>
  );
}
