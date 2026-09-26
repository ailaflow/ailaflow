import type { FormDefinition, ProcessDefinition, ProcessExecutionVariableValues } from '@ailaflow/shared';
import { VariableCachedValidator } from '@ailaflow/shared';
import { useEffect, useMemo, useRef } from 'react';
import { ProcessTesterTimelineView } from '../../views/process-tester/process-tester-timeline-view';
import { FormAdapter, FormError } from '../common/form-renderer/form-adapter';
import { FormRenderer } from '../common/form-renderer/form-renderer';
import { useProcessTester } from './process-tester-context';

export function ProcessTesterTimeline() {
  const state = useProcessTester();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.timelineItems.length === 1) {
      return;
    }
    const animationFrame = requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(animationFrame);
  }, [state.timelineItems.length]);

  return (
    <ProcessTesterTimelineView
      items={state.timelineItems}
      scrollContainerRef={scrollContainerRef}
      startForm={
        <ProcessTesterStartForm
          definition={state.process.definition}
          submitForm={state.submitForm}
          collectFormError={state.collectFormError}
        />
      }
      renderOutputForm={(form, output) => (
        <ProcessTesterOutputForm
          form={form}
          output={output}
          submitForm={state.submitForm}
          openStartForm={state.openStartForm}
          collectFormError={state.collectFormError}
        />
      )}
    />
  );
}

function ProcessTesterStartForm(props: {
  definition: ProcessDefinition;
  submitForm: (data: Record<string, unknown>) => void;
  collectFormError: (error: FormError) => void;
}) {
  const variableValidator = useMemo(() => new VariableCachedValidator(), []);
  const startFormAdapter = useMemo<FormAdapter>(
    () => ({
      allowedToReadVariableNames: null,
      outputVariableNames: props.definition.properties.startVariableNames,

      assertVariableValue(name: string, value: unknown) {
        variableValidator.assertVariableValueIsValid(name, value, props.definition);
      },
      async readVariable() {
        throw new Error('Start form does not have any variables to read');
      },
      async openStartForm() {
        throw new Error('Opening the start form is not supported in the tester');
      },
      async submitForm(_, data: Record<string, unknown>) {
        props.submitForm(data);
      },
      getTransientParams: () => null,
      collectFormError: props.collectFormError
    }),
    [props.definition, props.submitForm, variableValidator]
  );
  return <FormRenderer form={props.definition.properties.startForm} adapter={startFormAdapter} />;
}

function ProcessTesterOutputForm(props: {
  form: FormDefinition;
  output: ProcessExecutionVariableValues;
  openStartForm: () => void;
  submitForm: (values: ProcessExecutionVariableValues) => void;
  collectFormError: (error: FormError) => void;
}) {
  const outputFormAdapter = useMemo<FormAdapter>(
    () => ({
      allowedToReadVariableNames: Object.keys(props.output),
      outputVariableNames: [],
      assertVariableValue: () => {},
      readVariable: async (_, name: string) => props.output[name],
      async openStartForm() {
        props.openStartForm();
      },
      async submitForm(_, values) {
        props.submitForm(values);
      },
      getTransientParams: () => null,
      collectFormError: props.collectFormError
    }),
    [props.output, props.openStartForm, props.submitForm]
  );
  return <FormRenderer form={props.form} adapter={outputFormAdapter} />;
}
