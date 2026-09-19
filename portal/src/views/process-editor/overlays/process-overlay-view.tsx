import { SvgIcon } from '../../common/svg-icons';

export interface ProcessOverlayViewProps {
  title: string;
  canClose: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function ProcessOverlayView(props: ProcessOverlayViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 border-b border-slate-200 px-5 py-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="min-w-0 text-2xl font-semibold text-slate-800">{props.title}</h2>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={!props.canClose}
              onClick={props.onClose}
              aria-label="Back to designer"
              className="cursor-pointer inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300 disabled:hover:bg-slate-100 disabled:hover:text-slate-300"
            >
              <SvgIcon name="x" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">{props.children}</div>
    </div>
  );
}
