export interface ProcessSubEditorViewProps {
  title: string;
  canOk: boolean;
  onCancel: () => void;
  onOk: () => void;
  children: React.ReactNode;
}

export function ProcessSubEditorView(props: ProcessSubEditorViewProps) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="shrink-0 border-b border-slate-200 px-5 py-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="min-w-0 text-2xl font-semibold text-slate-800">{props.title}</h2>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={props.onCancel}
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!props.canOk}
              onClick={props.onOk}
              className="inline-flex h-9 items-center justify-center rounded-md border border-slate-900 bg-slate-900 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:text-white disabled:hover:bg-slate-300"
            >
              OK
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">{props.children}</div>
    </div>
  );
}
