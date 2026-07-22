import { ProcessDto, TestProcessUpdate, VariableCachedValidator } from '@aila/model';
import { useApiClient } from '../../auth/auth-context';
import { useEffect, useMemo, useState } from 'react';
import { FormRenderer } from '../form-renderer/form-renderer';
import { FormAdapter } from '../form-renderer/form-adapter';

export interface ProcessTesterContentProps {
  process: ProcessDto;
}

export function ProcessTesterContent(props: ProcessTesterContentProps) {
  const apiClient = useApiClient();
  const variableValidator = useMemo(() => new VariableCachedValidator(), []);
  const [formData, setFormData] = useState<Record<string, unknown> | null>(null);
  const [updates, setUpdates] = useState<TestProcessUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!formData) {
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
          { input: formData! }
        );
      } catch (e) {
        setError(String(e));
      }
    }

    test();
    return () => abortController.abort();
  }, [formData]);

  const startFormAdapter = useMemo<FormAdapter>(
    () => ({
      allowedToReadVariableNames: null,
      outputVariableNames: props.process.definition.properties.startVariableNames,

      async readVariable() {
        throw new Error('Start form does not have any variables to read');
      },
      async submit(_: AbortSignal, data: Record<string, unknown>) {
        setFormData(data);
      },
      assertVariableValue(name: string, value: unknown) {
        variableValidator.assertValidVariableValue(name, value, props.process.definition);
      }
    }),
    [props.process.definition, variableValidator]
  );

  if (formData === null) {
    return <FormRenderer form={props.process.definition.properties.startForm} adapter={startFormAdapter} />;
  }

  return (
    <div className="overflow-auto h-full p-4">
      <h2>Process Updates</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
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
