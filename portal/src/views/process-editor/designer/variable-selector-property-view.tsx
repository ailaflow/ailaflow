import { VariableDefinition } from '@ailaflow/shared';
import { SvgIcon } from '../../common/svg-icons';
import { EditorPropertyView } from './editor-property-view';

export interface VariableSelectorPropertyViewProps {
  label: string;
  variables: VariableDefinition[];
  variableNames: string[];
  onChange: (variableNames: string[]) => void;
  error?: string;
}

export function VariableSelectorPropertyView(props: VariableSelectorPropertyViewProps) {
  const availableNames = props.variables.map(variable => variable.name).filter(name => !props.variableNames.includes(name));

  function addVariable(name: string) {
    if (name) {
      props.onChange([...props.variableNames, name]);
    }
  }

  function removeVariable(index: number) {
    props.onChange(props.variableNames.filter((_, currentIndex) => currentIndex !== index));
  }

  return (
    <EditorPropertyView
      label={props.label}
      action={
        <select
          value=""
          onChange={event => addVariable(event.target.value)}
          disabled={availableNames.length === 0}
          aria-label={`Add variable to ${props.label}`}
          className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm font-medium text-slate-700 outline-none disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">{availableNames.length === 0 ? 'No variables available' : 'Add variable...'}</option>
          {availableNames.map(name => (
            <option key={name} value={name}>
              Add ${name}
            </option>
          ))}
        </select>
      }
    >
      {props.variableNames.length === 0 && (
        <div className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-500">No variables selected.</div>
      )}

      {props.variableNames.map((name, index) => (
        <div
          key={`${name}_${index}`}
          className="flex min-h-9 items-center gap-2 rounded-md border border-slate-200 bg-white/60 py-1.5 pl-3 pr-1.5"
        >
          <span className="min-w-0 flex-1 truncate text-sm text-slate-700">${name}</span>
          <button
            type="button"
            onClick={() => removeVariable(index)}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            aria-label={`Remove variable ${name}`}
            title="Remove variable"
          >
            <SvgIcon name="x" className="h-4 w-4" />
          </button>
        </div>
      ))}

      {props.error && <div className="px-1 text-xs text-red-700">{props.error}</div>}
    </EditorPropertyView>
  );
}
