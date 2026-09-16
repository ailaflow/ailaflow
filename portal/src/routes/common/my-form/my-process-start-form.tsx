import { useLoader } from '@aibindkit/react';
import type { StartMyProcessRequest } from '@ailaflow/shared';
import { useMemo } from 'react';
import { useApiClient } from '../../../auth/auth-context';
import { MyFormErrorView } from '../../../views/common/my-form/my-form-error-view';
import { MyFormLoadingView } from '../../../views/common/my-form/my-form-loading-view';
import { FormAdapter } from '../form-renderer/form-adapter';
import { FormRenderer } from '../form-renderer/form-renderer';

export interface MyProcessStartFormArgs {
  processName: string;
  testUserName?: string;
  chatSession?: NonNullable<StartMyProcessRequest['chatSession']>;
}

export interface MyProcessStartFormProps {
  args: MyProcessStartFormArgs;
  onStarted?(executionId: string): void | Promise<void>;
}

export function MyProcessStartForm({ args, onStarted }: MyProcessStartFormProps) {
  const apiClient = useApiClient();
  const { data, error, isLoading } = useLoader(
    abortSignal => apiClient.myProcess.getMyProcessStartForm(abortSignal, args.processName, { testUserName: args.testUserName }),
    [apiClient, args]
  );

  const formAdapter = useMemo<FormAdapter>(
    () => ({
      allowedToReadVariableNames: [],
      readVariable() {
        throw new Error('Start form cannot read variables');
      },
      outputVariableNames: data?.startVariableSchemas ? Object.keys(data.startVariableSchemas) : [],
      assertVariableValue() {},
      async submitForm(abortSignal: AbortSignal, startValues: Record<string, unknown>) {
        const response = await apiClient.myProcess.startMyProcess(abortSignal, args.processName, {
          startValues,
          chatSession: args.chatSession
        });
        await onStarted?.(response.executionId);
      },
      async startProcess() {
        throw new Error('Not implemented');
      }
    }),
    [apiClient, args, data, onStarted]
  );

  if (isLoading) {
    return <MyFormLoadingView />;
  }
  if (error) {
    return <MyFormErrorView error={error} />;
  }
  return <FormRenderer form={data.form} adapter={formAdapter} />;
}
