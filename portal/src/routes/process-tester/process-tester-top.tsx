import type { FormDefinition, ProcessDefinition, ProcessExecutionVariableValues } from '@ailaflow/shared';
import { VariableCachedValidator } from '@ailaflow/shared';
import { useEffect, useMemo, useRef } from 'react';
import { ProcessTesterTimelineView } from '../../views/process-tester/process-tester-top-view';
import { FormAdapter } from '../common/form-renderer/form-adapter';
import { FormRenderer } from '../common/form-renderer/form-renderer';
import { useProcessTester } from './process-tester-context';

export function ProcessTesterTop() {
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
      startForm={<ProcessTesterStartForm definition={state.process.definition} onSubmit={state.submitStartForm} />}
      renderOutputForm={(form, output) => <ProcessTesterOutputForm form={form} output={output} />}
    />
  );
}

function ProcessTesterStartForm(props: { definition: ProcessDefinition; onSubmit: (data: Record<string, unknown>) => void }) {
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
        props.onSubmit(data);
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
      assertVariableValue: () => {},
      readVariable: async (_, name: string) => props.output[name],
      async openStartForm() {
        throw new Error('Opening the start form is not supported in the tester');
      },
      async submitForm() {
        throw new Error('Submitting the form is not supported in the tester');
      }
    }),
    [props.output]
  );
  return <FormRenderer form={props.form} adapter={outputFormAdapter} />;
}
