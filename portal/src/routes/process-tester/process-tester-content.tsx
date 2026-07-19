import { ProcessDto, TestProcessUpdate } from '@aila/model';
import { useApiClient } from '../../auth/auth-context';
import { useEffect, useState } from 'react';
import { FormRenderer } from '../form-renderer/form-renderer';

export interface ProcessTesterContentProps {
  process: ProcessDto;
}

export function ProcessTesterContent(props: ProcessTesterContentProps) {
  const apiClient = useApiClient();
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

  function onSubmitValidData(data: Record<string, unknown>) {
    setFormData(data);
  }

  if (formData === null) {
    return (
      <FormRenderer
        definition={props.process.definition}
        form={props.process.definition.properties.startForm}
        outputVariableNames={props.process.definition.properties.startVariableNames}
        onSubmitValidData={onSubmitValidData}
      />
    );
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
