import { EditorProperty } from './editor-property';

export function StringEditorProperty(props: { label: string; value: string; error?: string; onValueChanged: (value: string) => void }) {
  return (
    <EditorProperty label={props.label}>
      <label
        className={`flex h-9 min-w-0 overflow-hidden rounded-md border bg-white ${
          props.error ? 'border-red-300' : 'border-slate-300'
        }`}
      >
        <input
          type="text"
          value={props.value}
          onChange={e => props.onValueChanged(e.target.value)}
          className="h-full min-w-0 flex-1 px-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
          placeholder={props.label}
        />
      </label>
      {props.error && <div className="px-1 text-xs text-red-700">{props.error}</div>}
    </EditorProperty>
  );
}
