import type { VariableDefinition } from '@ailaflow/shared';
import { DropdownPropertyView } from './dropdown-property-view';

export interface VariableNamePropertyViewProps {
  label: string;
  value: string;
  variables: VariableDefinition[];
  error?: string;
  onValueChanged: (value: string) => void;
}

export function VariableNamePropertyView(props: VariableNamePropertyViewProps) {
  return (
    <DropdownPropertyView
      label={props.label}
      value={props.value}
      options={[
        { label: 'Not set', value: '' },
        ...props.variables.map(variable => ({ label: `$${variable.name}`, value: variable.name }))
      ]}
      placeholder={`$${props.value}`}
      error={props.error}
      onValueChanged={props.onValueChanged}
    />
  );
}
