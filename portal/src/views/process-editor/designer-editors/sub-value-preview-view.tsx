export interface SubValuePreviewViewProps {
  children: React.ReactNode;
  onEdit: () => void;
}

export function SubValuePreviewView(props: SubValuePreviewViewProps) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-500">{props.children}</div>
        <button
          type="button"
          className="inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          onClick={props.onEdit}
        >
          Edit
        </button>
      </div>
    </div>
  );
}
