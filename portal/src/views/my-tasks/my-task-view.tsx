import type { ReactNode } from 'react';

export interface MyTaskViewProps {
  children: ReactNode;
  onBack(): void;
}

export function MyTaskView(props: MyTaskViewProps) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-lg font-semibold text-slate-600">
            T
          </span>
          <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900">Fulfill task</h1>
        </div>
        <button
          type="button"
          onClick={props.onBack}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          Back to tasks
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">{props.children}</div>
    </div>
  );
}
