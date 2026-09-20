import { SvgIcon } from '../../common/svg-icons';
import { EditorPropertyView } from './editor-property-view';

export interface ProcessSelectorPropertyViewProps {
  label: string;
  processNames: string[];
  onChange(processNames: string[]): void;
  onOpenSelector(): void;
  error?: string;
}

export function ProcessSelectorPropertyView(props: ProcessSelectorPropertyViewProps) {
  function removeProcess(index: number) {
    props.onChange(props.processNames.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <EditorPropertyView
      label={props.label}
      action={
        <button
          type="button"
          onClick={props.onOpenSelector}
          className="cursor-pointer inline-flex h-8 items-center rounded-md border border-slate-300 bg-white px-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Select processes...
        </button>
      }
    >
      {props.processNames.length === 0 && (
        <div className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-500">No processes selected.</div>
      )}

      {props.processNames.map((name, index) => (
        <div
          key={`${name}_${index}`}
          className="flex min-h-9 items-center gap-2 rounded-md border border-slate-200 bg-white/60 py-1.5 pl-3 pr-1.5"
        >
          <span className="min-w-0 flex-1 truncate text-sm text-slate-700">/{name}</span>
          <button
            type="button"
            onClick={() => removeProcess(index)}
            className="cursor-pointer inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            aria-label={`Remove process ${name}`}
            title="Remove process"
          >
            <SvgIcon name="x" className="h-4 w-4" />
          </button>
        </div>
      ))}

      {props.error && <div className="px-1 text-xs text-red-700">{props.error}</div>}
    </EditorPropertyView>
  );
}
