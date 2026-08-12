import {
  FormDefinition,
  ProcessDefinition,
  ProcessDto,
  ProcessExecutionVariableValues,
  ReturnStep,
  TestProcessUpdate,
  VariableCachedValidator
} from '@aila/model';
import { useApiClient } from '../../auth/auth-context';
import { useEffect, useMemo, useState } from 'react';
import { FormRenderer } from '../common/form-renderer/form-renderer';
import { FormAdapter } from '../common/form-renderer/form-adapter';
import { DefinitionWalker } from 'sequential-workflow-model';

export interface ProcessTesterProps {
  process: ProcessDto;
}

export function ProcessTester(props: ProcessTesterProps) {
  const apiClient = useApiClient();
  const [startFormData, setStartFormData] = useState<Record<string, unknown> | null>(null);
  const [updates, setUpdates] = useState<TestProcessUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const result = useMemo(() => updates.find(u => u.result)?.result, [updates]);

  useEffect(() => {
    if (!startFormData) {
      return;
    }
    const abortController = new AbortController();

    async function test() {
      try {
        await apiClient.process.testProcess(
          abortController.signal,
          {
            onMessage(update) {
              setUpdates(prev => [...prev, update]);
            },
            onClose() {
              setUpdates(prev => [...prev, { type: 'Connection closed' } as TestProcessUpdate]);
            }
          },
          props.process.name,
          { input: startFormData! }
        );
      } catch (e) {
        setError(String(e));
      }
    }

    test();
    return () => abortController.abort();
  }, [startFormData]);

  if (error) {
    return <ProcessTesterError error={error} />;
  }
  if (startFormData === null) {
    return <ProcessTesterStartForm definition={props.process.definition} onSubmit={data => setStartFormData(data)} />;
  }
  if (result) {
    if (!result.success) {
      return <ProcessTesterError error={result.error} />;
    }
    const step = result.stepId ? new DefinitionWalker().findById(props.process.definition, result.stepId) : null;
    const returnStep = step && step.type === 'return' ? (step as ReturnStep) : null;
    if (returnStep?.properties.outputForm) {
      return <ProcessTesterOutputForm form={returnStep.properties.outputForm} output={result.output} />;
    }
    return <ProcessTesterOutput output={result.output} />;
  }

  return (
    <div className="overflow-auto h-full p-4">
      <h2>Process Updates</h2>
      <ul>
        {updates.map((update, index) => (
          <li key={index}>
            <pre>{JSON.stringify(update, null, 2)}</pre>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProcessTesterError(props: { error: string }) {
  return <div style={{ color: 'red' }}>{props.error}</div>;
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
    [props.definition, variableValidator]
  );
  return <FormRenderer form={props.definition.properties.startForm} adapter={startFormAdapter} />;
}

function ProcessTesterOutputForm(props: { form: FormDefinition; output: ProcessExecutionVariableValues }) {
  const variableValidator = useMemo(() => new VariableCachedValidator(), []);
  const startFormAdapter = useMemo<FormAdapter>(
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
    [props.form, variableValidator]
  );
  return <FormRenderer form={props.form} adapter={startFormAdapter} />;
}

function ProcessTesterOutput(props: { output: ProcessExecutionVariableValues }) {
  return (
    <div>
      <h2>Process Finished</h2>
      <ul>
        {Object.entries(props.output).map(([name, value]) => (
          <li key={name}>
            {name}: {JSON.stringify(value)}
          </li>
        ))}
      </ul>
    </div>
  );
}
