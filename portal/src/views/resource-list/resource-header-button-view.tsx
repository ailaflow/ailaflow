import type { ReactNode } from 'react';

export interface ResourceHeaderButtonViewProps {
  children: ReactNode;
  onClick(): void | Promise<void>;
}

export function ResourceHeaderButtonView(props: ResourceHeaderButtonViewProps) {
  return (
    <button
      type="button"
      onClick={() => void props.onClick()}
      className="cursor-pointer inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-slate-900 bg-slate-900 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
    >
      {props.children}
    </button>
  );
}
