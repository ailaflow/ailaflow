import type { ReactNode } from 'react';

export interface MyFormViewProps {
  icon: string;
  title: string;
  description?: string;
  backLabel: string;
  children: ReactNode;
  onBack(): void;
}

export function MyFormView(props: MyFormViewProps) {
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-lg font-semibold text-slate-600">
            {props.icon}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900">{props.title}</h1>
            {props.description ? <p className="truncate text-sm text-slate-500">{props.description}</p> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={props.onBack}
          className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
        >
          {props.backLabel}
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">{props.children}</div>
    </div>
  );
}
