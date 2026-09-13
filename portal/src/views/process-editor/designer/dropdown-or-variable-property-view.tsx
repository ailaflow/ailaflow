import type { StringOrVariable, VariableDefinition } from '@ailaflow/shared';
import { EditorPropertyView } from './editor-property-view';

interface DropdownOrVariablePropertyViewBaseProps {
  label: string;
  variables: VariableDefinition[];
  options: readonly { label: string; value: string }[];
  placeholder?: string;
  error?: string;
}

export type DropdownOrVariablePropertyViewProps = DropdownOrVariablePropertyViewBaseProps &
  (
    | {
        optional?: false;
        value: StringOrVariable;
        onValueChanged: (value: StringOrVariable) => void;
      }
    | {
        optional: true;
        value: StringOrVariable | undefined;
        onValueChanged: (value: StringOrVariable | undefined) => void;
      }
  );

export function DropdownOrVariablePropertyView(props: DropdownOrVariablePropertyViewProps) {
  const stringVariables = props.variables.filter(variable => variable.schema.type === 'string');
  const selectedValue = props.value?.type === 'string' ? props.value.value : undefined;
  const selectedIndex = props.options.findIndex(option => option.value === selectedValue);

  function changeType(type: string) {
    if (type === 'unset') {
      if (props.optional) {
        props.onValueChanged(undefined);
      }
      return;
    }

    if ((type !== 'string' && type !== 'variable') || type === props.value?.type) {
      return;
    }

    props.onValueChanged(
      type === 'string' ? { type, value: props.options[0]?.value ?? '' } : { type, name: stringVariables[0]?.name ?? '' }
    );
  }

  return (
    <EditorPropertyView
      label={props.label}
      action={
        <select
          value={props.value?.type ?? 'unset'}
          onChange={event => changeType(event.target.value)}
          aria-label={`${props.label} type`}
          className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm font-medium text-slate-700 outline-none"
        >
          {props.optional && <option value="unset">Not set</option>}
          <option value="string">Predefined</option>
          <option value="variable">Variable</option>
        </select>
      }
    >
      {props.value?.type === 'string' && (
        <label
          className={`flex h-9 min-w-0 overflow-hidden rounded-md border bg-white ${props.error ? 'border-red-300' : 'border-slate-300'}`}
        >
          <select
            value={selectedIndex < 0 ? '' : selectedIndex}
            onChange={event => {
              const option = props.options[Number(event.target.value)];
              if (event.target.value !== '' && option) {
                props.onValueChanged({ type: 'string', value: option.value });
              }
            }}
            disabled={props.options.length === 0}
            aria-label={`${props.label} value`}
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
      )}
      {props.value?.type === 'variable' && (
        <label
          className={`flex h-9 min-w-0 overflow-hidden rounded-md border bg-white ${props.error ? 'border-red-300' : 'border-slate-300'}`}
        >
          <select
            value={props.value.name}
            onChange={event => props.onValueChanged({ type: 'variable', name: event.target.value })}
            disabled={stringVariables.length === 0}
            aria-label={`${props.label} variable`}
            aria-invalid={Boolean(props.error)}
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
