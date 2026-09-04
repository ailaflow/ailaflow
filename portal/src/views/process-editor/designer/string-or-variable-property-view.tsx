import type { StringOrVariable, VariableDefinition } from '@aila/model';
import { EditorPropertyView } from './editor-property-view';

export interface StringOrVariablePropertyViewProps {
  label: string;
  value: StringOrVariable;
  variables: VariableDefinition[];
  error?: string;
  onValueChanged: (value: StringOrVariable) => void;
}

export function StringOrVariablePropertyView(props: StringOrVariablePropertyViewProps) {
  const stringVariables = props.variables.filter(variable => variable.schema.type === 'string');

  function changeType(type: StringOrVariable['type']) {
    if (type === props.value.type) {
      return;
    }

    props.onValueChanged(type === 'string' ? { type, value: '' } : { type, name: stringVariables[0]?.name ?? '' });
  }

  return (
    <EditorPropertyView
      label={props.label}
      action={
        <select
          value={props.value.type}
          onChange={event => changeType(event.target.value as StringOrVariable['type'])}
          aria-label={`${props.label} type`}
          className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm font-medium text-slate-700 outline-none"
        >
          <option value="string">String</option>
          <option value="variable">Variable</option>
        </select>
      }
    >
      {props.value.type === 'string' ? (
        <label
          className={`flex h-9 min-w-0 overflow-hidden rounded-md border bg-white ${props.error ? 'border-red-300' : 'border-slate-300'}`}
        >
          <input
            type="text"
            value={props.value.value}
            onChange={event => props.onValueChanged({ type: 'string', value: event.target.value })}
            className="h-full min-w-0 flex-1 px-2 text-sm text-slate-800 outline-none placeholder:text-slate-400"
            placeholder={props.label}
          />
        </label>
      ) : (
        <label
          className={`flex h-9 min-w-0 overflow-hidden rounded-md border bg-white ${props.error ? 'border-red-300' : 'border-slate-300'}`}
        >
          <select
            value={props.value.name}
            onChange={event => props.onValueChanged({ type: 'variable', name: event.target.value })}
            disabled={stringVariables.length === 0}
            aria-label={`${props.label} variable`}
            className="h-full min-w-0 flex-1 bg-white px-2 text-sm text-slate-800 outline-none disabled:bg-slate-50 disabled:text-slate-400"
          >
            {stringVariables.length === 0 && <option value="">No string variables available</option>}
            {stringVariables.map(variable => (
              <option key={variable.name} value={variable.name}>
                ${variable.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {props.error && <div className="px-1 text-xs text-red-700">{props.error}</div>}
    </EditorPropertyView>
  );
}
