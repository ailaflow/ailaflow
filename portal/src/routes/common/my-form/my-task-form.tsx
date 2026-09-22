import { useLoader } from '@aibindkit/react';
import { useMemo, useState } from 'react';
import { useApiClient } from '../../../auth/auth-context';
import { MyFormContainerView } from '../../../views/common/my-form/my-form-container-view';
import { MyFormErrorView } from '../../../views/common/my-form/my-form-error-view';
import { MyFormLoadingView } from '../../../views/common/my-form/my-form-loading-view';
import { FormAdapter, FormError } from '../form-renderer/form-adapter';
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
    signal => apiClient.myTask.getMyTaskForm(signal, args.taskId, { testUserName: args.testUserName }),
    [apiClient, args]
  );
  const [formError, setFormError] = useState<FormError | null>(null);

  const formAdapter = useMemo<FormAdapter>(
    () => ({
      allowedToReadVariableNames: data?.inputVariableNames ?? [],
      outputVariableNames: data?.outputVariableSchemas ? Object.keys(data.outputVariableSchemas) : [],

      assertVariableValue() {},
      async openStartForm() {
        throw new Error('Task does not support opening a start form');
      },
      async submitForm(signal: AbortSignal, outputValues: Record<string, unknown>) {
        const response = await apiClient.myTask.submitMyTask(signal, {
          taskId: args.taskId,
          outputValues,
          testUserName: args.testUserName
        });
        if (!response.success) {
          throw new Error('Task could not be submitted');
        }
        await onSubmitted?.();
      },
      async readVariable(signal: AbortSignal, variableName: string) {
        const response = await apiClient.myTask.getTaskVariableValue(signal, {
          taskId: args.taskId,
          variableName,
          testUserName: args.testUserName
        });
        return response.value;
      },
      collectFormError(error: FormError) {
        setFormError(error);
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
  return (
    <MyFormContainerView formError={formError} onFormErrorClose={() => setFormError(null)}>
      <FormRenderer form={data.form} adapter={formAdapter} />
    </MyFormContainerView>
  );
}
