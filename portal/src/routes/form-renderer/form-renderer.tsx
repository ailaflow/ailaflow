import { FormDefinition, ProcessDefinition, VariableCachedValidator } from '@aila/model';
import { useMemo } from 'react';
import { IframeForm } from './iframe-form';
import { JsonForm } from './json-form';

export interface FormRendererProps {
  definition: ProcessDefinition;
  form?: FormDefinition;
  outputVariableNames: string[];
  onSubmitValidData: (output: Record<string, unknown>) => void;
}

export function FormRenderer(props: FormRendererProps) {
  const variableValidator = useMemo(() => new VariableCachedValidator(), []);

  function onSubmit(data: Record<string, unknown>) {
    for (const name of props.outputVariableNames) {
      const value = data[name];
      if (!value) {
        throw new Error(`Output variable ${name} is required but not provided.`);
      }
      variableValidator.assertValidVariableValue(name, value, props.definition);
    }

    props.onSubmitValidData(data);
  }

  return props.form ? (
    <IframeForm form={props.form} onSubmit={onSubmit} />
  ) : (
    <JsonForm
      definition={props.definition}
      variableValidator={variableValidator}
      outputVariableNames={props.outputVariableNames}
      onSubmit={onSubmit}
    />
  );
}
