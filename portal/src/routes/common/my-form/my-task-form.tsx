import { useLoader } from '@aibindkit/react';
import { useMemo } from 'react';
import { useApiClient } from '../../../auth/auth-context';
import { MyFormErrorView } from '../../../views/common/my-form/my-form-error-view';
import { MyFormLoadingView } from '../../../views/common/my-form/my-form-loading-view';
import { FormAdapter } from '../form-renderer/form-adapter';
import { FormRenderer } from '../form-renderer/form-renderer';

export interface MyTaskFormArgs {
  taskId: string;
  testUserName?: string;
}

export interface MyTaskFormProps {
  args: MyTaskFormArgs;
  onSubmitted?(): void | Promise<void>;
}

export function MyTaskForm({ args, onSubmitted }: MyTaskFormProps) {
  const apiClient = useApiClient();
  const { data, error, isLoading } = useLoader(
    abortSignal => apiClient.myTask.getMyTaskForm(abortSignal, args.taskId, { testUserName: args.testUserName }),
    [apiClient, args]
  );

  const formAdapter = useMemo<FormAdapter>(
    () => ({
      allowedToReadVariableNames: data?.inputVariableNames ?? [],
      async readVariable(abortSignal: AbortSignal, variableName: string) {
        const response = await apiClient.myTask.getTaskVariableValue(abortSignal, {
          taskId: args.taskId,
          variableName,
          testUserName: args.testUserName
        });
        return response.value;
      },
      outputVariableNames: data?.outputVariableSchemas ? Object.keys(data.outputVariableSchemas) : [],
      assertVariableValue() {},
      async submit(abortSignal: AbortSignal, outputValues: Record<string, unknown>) {
        const response = await apiClient.myTask.submitMyTask(abortSignal, {
          taskId: args.taskId,
          outputValues,
          testUserName: args.testUserName
        });
        if (!response.success) {
          throw new Error('Task could not be submitted');
        }
        await onSubmitted?.();
      }
    }),
    [apiClient, args, data, onSubmitted]
  );

  if (isLoading) {
    return <MyFormLoadingView />;
  }
  if (error) {
    return <MyFormErrorView error={error} />;
  }
  return <FormRenderer form={data.form} adapter={formAdapter} />;
}
