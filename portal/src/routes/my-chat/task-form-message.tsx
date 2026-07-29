import { useApiClient } from '../../auth/auth-context';
import { FormRenderer } from '../common/form-renderer/form-renderer';
import { FormAdapter } from '../common/form-renderer/form-adapter';
import { useMemo } from 'react';
import { FormMessageView } from '../../views/my-chat/form-message-view';

export interface TaskFormMessageProps {
  taskId: string;
  executionId: string;
  messageId: number;
  completedMessageIndex: number;
  finished: boolean;
}

export function TaskFormMessage(props: TaskFormMessageProps) {
  const apiClient = useApiClient();

  const formAdapter: FormAdapter = useMemo(
    () => ({
      allowedToReadVariableNames: [],
      readVariable() {
        throw new Error('Start form cannot read variables');
      },
      outputVariableNames: [],
      assertVariableValue() {},
      async submit() {
        //
      }
    }),
    [props, apiClient]
  );

  if (props.finished) {
    return <FormMessageView title="Form">Finished</FormMessageView>;
  }

  return (
    <FormMessageView title="Form">
      <FormRenderer
        form={{
          css: '',
          html: '',
          js: '',
          inputExamples: []
        }}
        adapter={formAdapter}
      />
    </FormMessageView>
  );
}
