import type { ReactNode } from 'react';

export interface DashboardViewProps {
  children: ReactNode;
}

export function DashboardView(props: DashboardViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        <div className="flex flex-col gap-5">{props.children}</div>
      </div>
    </div>
  );
}

export function DashboardRowView(props: { children: ReactNode }) {
  return <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-3">{props.children}</div>;
}
