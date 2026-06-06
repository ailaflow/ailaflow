import { EditorPropertyView } from './editor-property-view';

export interface SelectEditorPropertyViewProps {
  label: string;
  value: string;
  options: {
    label: string;
    value: string;
  }[];
  error?: string;
  onValueChanged(value: string): void;
}

export function SelectEditorPropertyView(props: SelectEditorPropertyViewProps) {
  return (
    <EditorPropertyView label={props.label}>
      <label
        className={`flex h-9 min-w-0 overflow-hidden rounded-md border bg-white ${props.error ? 'border-red-300' : 'border-slate-300'}`}
      >
        <select
          value={props.value}
          onChange={e => props.onValueChanged(e.target.value)}
          className="h-full min-w-0 flex-1 bg-white px-2 text-sm text-slate-800 outline-none"
        >
          {props.options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {props.error && <div className="px-1 text-xs text-red-700">{props.error}</div>}
    </EditorPropertyView>
  );
}
