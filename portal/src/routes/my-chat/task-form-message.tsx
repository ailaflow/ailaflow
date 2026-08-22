import { useApiClient } from '../../auth/auth-context';
import { FormRenderer } from '../common/form-renderer/form-renderer';
import { FormAdapter } from '../common/form-renderer/form-adapter';
import { useMemo } from 'react';
import { FormMessageView } from '../../views/my-chat/form-message-view';
import { useLoader } from '@aibindkit/react';

export interface TaskFormMessageProps {
  taskId: string;
  sessionToken: string;
  messageId: number;
  completedMessageIndex: number;
  finished: boolean;
}

export function TaskFormMessage(props: TaskFormMessageProps) {
  const apiClient = useApiClient();
  const { data, error, isLoading } = useLoader(
    abortSignal => apiClient.myTask.getMyTaskForm(abortSignal, props.taskId),
    [apiClient, props.taskId]
  );

  const formAdapter: FormAdapter = useMemo(
    () => ({
      allowedToReadVariableNames: data?.inputVariableNames ?? [],
      async readVariable(abortSignal: AbortSignal, variableName: string) {
        const response = await apiClient.myTask.getTaskVariableValue(abortSignal, {
          taskId: props.taskId,
          variableName
        });
        return response.value;
      },
      outputVariableNames: data?.outputVariableSchemas ? Object.keys(data.outputVariableSchemas) : [],
      assertVariableValue() {},
      async submit(abortSignal: AbortSignal, outputValues: Record<string, unknown>) {
        await apiClient.myTask.submitMyTask(abortSignal, {
          taskId: props.taskId,
          outputValues
        });
      }
    }),
    [props, apiClient]
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
