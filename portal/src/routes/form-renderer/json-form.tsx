import { useMemo, useState } from 'react';
import { JsonFormView } from '../../views/form-renderer/json-form-view';
import { FormAdapter } from './form-adapter';

export interface JsonFormProps {
  adapter: FormAdapter;
}

export function JsonForm({ adapter }: JsonFormProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const errors = useMemo<Record<string, string>>(() => {
    const result: Record<string, string> = {};
    for (const name of adapter.outputVariableNames) {
      try {
        const value = values[name];
        if (!value) {
          result[name] = 'Value is required';
          continue;
        }
        const json = JSON.parse(value);
        adapter.assertVariableValue(name, json);
      } catch (e) {
        const error = (e as Error)?.message ?? String(e);
        result[name] = error;
      }
    }
    return result;
  }, [adapter]);

  async function onSubmit() {
    const output: Record<string, unknown> = {};
    for (const name of adapter.outputVariableNames) {
      const value = values[name] ?? '';
      output[name] = JSON.parse(value);
    }
    const abortSignal = AbortSignal.timeout(5_000);
    await adapter.submit(abortSignal, output);
  }

  function onValueChanged(name: string, value: string) {
    setValues(currentValues => ({
      ...currentValues,
      [name]: value
    }));
  }

  return (
    <JsonFormView
      variableNames={adapter.outputVariableNames}
      values={values}
      errors={errors}
      onValueChanged={onValueChanged}
      onSubmit={onSubmit}
    />
  );
}
