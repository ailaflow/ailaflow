import { ProcessDto, TestProcessUpdate } from '@aila/model';
import { DefaultStartForm } from './default-start-form';
import { useApiClient } from '../../auth/auth-context';
import { useEffect, useState } from 'react';

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
          props.process.id,
          { input: formData! }
        );
      } catch (e) {
        setError(String(e));
      }
    }

    test();
    return () => abortController.abort();
  }, [formData]);

  if (formData === null) {
    return <DefaultStartForm definition={props.process.definition} onSubmit={setFormData} />;
  }
  return (
    <div>
      <h2>Process Updates</h2>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <ul>
        {updates.map((update, index) => (
          <li key={index}>{JSON.stringify(update)}</li>
        ))}
      </ul>
    </div>
  );
}
