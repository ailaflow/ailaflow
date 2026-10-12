import { useLoader } from '@aibindkit/react';
import { useApiClient } from '../../../auth/auth-context';
import { MyFormLoadingView } from '../../../views/common/my-form/my-form-loading-view';
import { MyFormErrorView } from '../../../views/common/my-form/my-form-error-view';
import { MyProcessForm, MyProcessFormArgs } from '../my-form/my-process-form';
import { useMemo } from 'react';
import { FormMessageView } from '../../../views/my-chat/form-message-view';
import { FormPreviewView } from '../../../views/form-renderer/form-preview-view';
import { ProcessExecutionVariableValues } from '@ailaflow/shared';

export interface ReturnFormMessageProps {
  processName: string;
  stepId: string;
  values: ProcessExecutionVariableValues;
  onLockedClick: (args: MyProcessFormArgs) => void;
}

export function ReturnFormMessage(props: ReturnFormMessageProps) {
  const apiClient = useApiClient();
  const { data, error, isLoading } = useLoader(
    signal => apiClient.myProcess.getMyProcessReturnForm(signal, props.processName, props.stepId),
    [apiClient, props.processName, props.stepId]
  );
  const args: MyProcessFormArgs | null = useMemo(
    () => (data?.form ? { processName: props.processName, output: { values: props.values, form: data.form } } : null),
    [data, props]
  );
  const title = `/${props.processName}`;

  if (isLoading) {
    return (
      <FormMessageView title={title}>
        <FormPreviewView>
          <MyFormLoadingView progressLabel={null} />
        </FormPreviewView>
      </FormMessageView>
    );
  }
  if (error || !args) {
    const e = error ?? new Error('Failed to load return form');
    return (
      <FormMessageView title={title}>
        <FormPreviewView>
          <MyFormErrorView error={e} />
        </FormPreviewView>
      </FormMessageView>
    );
  }

  return (
    <FormMessageView title={title} lockedClickLabel={'Open form'} onLockedClick={() => props.onLockedClick(args)}>
      <FormPreviewView>
        <MyProcessForm args={args} />;
      </FormPreviewView>
    </FormMessageView>
  );
}
