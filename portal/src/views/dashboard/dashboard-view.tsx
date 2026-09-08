import type { ReactNode } from 'react';
import { DashboardPanelView } from './dashboard-panel-view';

export interface DashboardViewProps {
  chat: ReactNode;
  children: ReactNode;
}

export function DashboardView(props: DashboardViewProps) {
  return (
    <div className="h-full min-h-0 overflow-y-auto bg-slate-50 p-4 sm:p-5 lg:overflow-hidden">
      <div className="grid min-h-0 grid-cols-1 gap-5 lg:h-full lg:grid-cols-[minmax(0,7fr)_minmax(0,3fr)] lg:grid-rows-1">
        <DashboardPanelView title="My chat" className="h-[70dvh] min-h-96 lg:h-full lg:min-h-0">
          {props.chat}
        </DashboardPanelView>
        <div className="grid min-h-0 min-w-0 grid-cols-1 gap-5 lg:grid-rows-3">{props.children}</div>
      </div>
    </div>
  );
}
