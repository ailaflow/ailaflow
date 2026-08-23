import type { FormDefinition, ProcessDefinition, ProcessExecutionVariableValues, ReturnStep } from '@aila/model';
import { VariableCachedValidator } from '@aila/model';
import { useMemo } from 'react';
import { DefinitionWalker } from 'sequential-workflow-model';
import {
  ProcessTesterErrorView,
  ProcessTesterOutputView,
  ProcessTesterTopView,
  ProcessTesterUpdatesView
} from '../../views/process-tester/process-tester-top-view';
import { FormAdapter } from '../common/form-renderer/form-adapter';
import { FormRenderer } from '../common/form-renderer/form-renderer';
import { useProcessTester } from './process-tester-context';

export function ProcessTesterTop() {
  const state = useProcessTester();
  const result = useMemo(() => state.updates.find(update => update.result)?.result, [state.updates]);

  let content: React.ReactNode;
  if (state.error) {
    content = <ProcessTesterErrorView error={state.error} />;
  } else if (state.startFormData === null) {
    content = <ProcessTesterStartForm definition={state.process.definition} onSubmit={state.submitStartForm} />;
  } else if (result?.success) {
    const step = result.stepId ? new DefinitionWalker().findById(state.process.definition, result.stepId) : null;
    const returnStep = step?.type === 'return' ? (step as ReturnStep) : null;
    content = returnStep?.properties.outputForm ? (
      <ProcessTesterOutputForm form={returnStep.properties.outputForm} output={result.output} />
    ) : (
      <ProcessTesterOutputView output={result.output} />
    );
  } else {
    content = <ProcessTesterUpdatesView updates={state.updates} resultError={result?.error} />;
  }

  return <ProcessTesterTopView>{content}</ProcessTesterTopView>;
}

function ProcessTesterStartForm(props: { definition: ProcessDefinition; onSubmit: (data: Record<string, unknown>) => void }) {
  const variableValidator = useMemo(() => new VariableCachedValidator(), []);
  const startFormAdapter = useMemo<FormAdapter>(
    () => ({
      allowedToReadVariableNames: null,
      outputVariableNames: props.definition.properties.startVariableNames,

      async readVariable() {
        throw new Error('Start form does not have any variables to read');
      },
      async submit(_, data: Record<string, unknown>) {
        props.onSubmit(data);
      },
      assertVariableValue(name: string, value: unknown) {
        variableValidator.assertVariableValueIsValid(name, value, props.definition);
      }
    }),
    [props.definition, props.onSubmit, variableValidator]
  );
  return <FormRenderer form={props.definition.properties.startForm} adapter={startFormAdapter} />;
}

function ProcessTesterOutputForm(props: { form: FormDefinition; output: ProcessExecutionVariableValues }) {
  const outputFormAdapter = useMemo<FormAdapter>(
    () => ({
      allowedToReadVariableNames: Object.keys(props.output),
      outputVariableNames: [],

      async readVariable(_, name: string) {
        return props.output[name];
      },
      async submit() {
        // Nothing
      },
      assertVariableValue() {
        // Nothing
      }
    }),
    [props.output]
  );
  return <FormRenderer form={props.form} adapter={outputFormAdapter} />;
}
