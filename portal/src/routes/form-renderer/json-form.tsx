import { ProcessDefinition, VariableCachedValidator } from '@aila/model';
import { useMemo, useState } from 'react';
import { JsonFormView } from '../../views/form-renderer/json-form-view';

export interface JsonFormProps {
  variableValidator: VariableCachedValidator;
  definition: ProcessDefinition;
  outputVariableNames: string[];
  onSubmit: (output: Record<string, unknown>) => void;
}

export function JsonForm(props: JsonFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const errors = useMemo<Record<string, string>>(() => {
    const result: Record<string, string> = {};
    for (const name of props.outputVariableNames) {
      try {
        const value = values[name];
        if (!value) {
          result[name] = 'Value is required';
          continue;
        }
        const json = JSON.parse(value);
        props.variableValidator.assertValidVariableValue(name, json, props.definition);
      } catch (e) {
        const error = (e as Error)?.message ?? String(e);
        result[name] = error;
      }
    }
    return result;
  }, [props.definition, props.outputVariableNames, props.variableValidator, values]);

  function onSubmit() {
    const output: Record<string, unknown> = {};
    for (const name of props.outputVariableNames) {
      const value = values[name] ?? '';
      output[name] = JSON.parse(value);
    }
    props.onSubmit(output);
  }

  function onValueChanged(name: string, value: string) {
    setValues(currentValues => ({
      ...currentValues,
      [name]: value
    }));
  }

  return (
    <JsonFormView
      variableNames={props.outputVariableNames}
      values={values}
      errors={errors}
      onValueChanged={onValueChanged}
      onSubmit={onSubmit}
    />
  );
}
