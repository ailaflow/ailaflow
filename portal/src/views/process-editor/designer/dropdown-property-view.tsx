import { EditorPropertyView } from './editor-property-view';

export interface DropdownPropertyViewProps<T extends string | number> {
  label: string;
  value: T;
  options: readonly { label: string; value: T }[];
  placeholder?: string;
  error?: string;
  onValueChanged: (value: T) => void;
}

export function DropdownPropertyView<T extends string | number>(props: DropdownPropertyViewProps<T>) {
  const selectedIndex = props.options.findIndex(option => option.value === props.value);

  return (
    <EditorPropertyView label={props.label}>
      <label
        className={`flex h-9 min-w-0 overflow-hidden rounded-md border bg-white ${props.error ? 'border-red-300' : 'border-slate-300'}`}
      >
        <select
          value={selectedIndex < 0 ? '' : selectedIndex}
          onChange={event => {
            const option = props.options[Number(event.target.value)];
            if (event.target.value !== '' && option) {
              props.onValueChanged(option.value);
            }
          }}
          disabled={props.options.length === 0}
          aria-label={props.label}
          aria-invalid={Boolean(props.error)}
          className="h-full min-w-0 flex-1 bg-white px-2 text-sm text-slate-800 outline-none disabled:bg-slate-50 disabled:text-slate-400"
        >
          {selectedIndex < 0 && (
            <option value="" disabled>
              {props.placeholder ?? 'Select an option...'}
            </option>
          )}
          {props.options.map((option, index) => (
            <option key={index} value={index}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {props.error && <div className="px-1 text-xs text-red-700">{props.error}</div>}
    </EditorPropertyView>
  );
}
