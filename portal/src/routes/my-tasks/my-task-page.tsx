import { useLoader } from '@aibindkit/react';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApiClient } from '../../auth/auth-context';
import { MyTaskView } from '../../views/my-tasks/my-task-view';
import { PortalErrorView } from '../../views/portal/portal-error-view';
import { PortalLoadingView } from '../../views/portal/portal-loading-view';
import { FormAdapter } from '../common/form-renderer/form-adapter';
import { FormRenderer } from '../common/form-renderer/form-renderer';
import { Portal } from '../common/portal';

export function MyTaskPage() {
  const { taskId } = useParams();
  if (!taskId) {
    throw new Error('Task id is required');
  }

  const apiClient = useApiClient();
  const navigate = useNavigate();
  const { data, error, isLoading } = useLoader(abortSignal => apiClient.myTask.getMyTaskForm(abortSignal, taskId), [apiClient, taskId]);

  const formAdapter: FormAdapter = useMemo(
    () => ({
      allowedToReadVariableNames: data?.inputVariableNames ?? [],
      async readVariable(abortSignal: AbortSignal, variableName: string) {
        const response = await apiClient.myTask.getTaskVariableValue(abortSignal, {
          taskId,
          variableName
        });
        return response.value;
      },
      outputVariableNames: data?.outputVariableSchemas ? Object.keys(data.outputVariableSchemas) : [],
      assertVariableValue() {},
      async submit(abortSignal: AbortSignal, outputValues: Record<string, unknown>) {
        const response = await apiClient.myTask.submitMyTask(abortSignal, {
          taskId,
          outputValues
        });
        if (!response.success) {
          throw new Error('Task could not be submitted');
        }
        navigate('/my-tasks', { replace: true });
      }
    }),
    [apiClient, data, navigate, taskId]
  );

  function backToTasks(): void {
    navigate('/my-tasks');
  }

  if (isLoading) {
    return (
      <Portal>
        <PortalLoadingView />
      </Portal>
    );
  }
  if (error) {
    return (
      <Portal>
        <PortalErrorView error={error} />
      </Portal>
    );
  }

  return (
    <Portal>
      <MyTaskView onBack={backToTasks}>
        <FormRenderer form={data.form} adapter={formAdapter} />
      </MyTaskView>
    </Portal>
  );
}
