import { useLoader } from '@aibindkit/react';
import { useApiClient } from '../../auth/auth-context';
import { FormRenderer } from '../common/form-renderer/form-renderer';
import { FormAdapter } from '../common/form-renderer/form-adapter';
import { useMemo } from 'react';
import { FormMessageView } from '../../views/my-chat/form-message-view';

export interface FormMessageProps {
  processName: string;
  sessionToken: string;
  messageId: number;
  completedMessageIndex: number;
  finished: true | undefined;
}

export function FormMessage(props: FormMessageProps) {
  const apiClient = useApiClient();
  const { data, error, isLoading } = useLoader(
    abortSignal => apiClient.myProcess.getMyProcessStartForm(abortSignal, props.processName),
    [apiClient, props.processName]
  );

  const formAdapter: FormAdapter = useMemo(
    () => ({
      allowedToReadVariableNames: [],
      readVariable() {
        throw new Error('Start form cannot read variables');
      },
      outputVariableNames: data?.startVariableSchemas ? Object.keys(data.startVariableSchemas) : [],
      assertVariableValue() {},
      async submit(abortSignal: AbortSignal, data: Record<string, unknown>) {
        await apiClient.myProcess.startMyProcess(abortSignal, props.processName, {
          startValues: data,
          chatSession: {
            token: props.sessionToken,
            messageId: props.messageId,
            completedMessageIndex: props.completedMessageIndex
          }
        });
      }
    }),
    [data, props, apiClient]
  );

  if (isLoading) {
    return <FormMessageView title="Form">Loading...</FormMessageView>;
  }
  if (error) {
    return <FormMessageView title="Form">Error: {error.message}</FormMessageView>;
  }
  if (props.finished) {
    return <FormMessageView title="Form">Finished</FormMessageView>;
  }

  return (
    <FormMessageView title="Form">
      <FormRenderer form={data.form} adapter={formAdapter} />
    </FormMessageView>
  );
}
