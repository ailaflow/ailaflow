import type { CompletedChatMessage } from '@aibindkit/core';
import { FormMessageView } from '../../../views/my-chat/form-message-view';
import { MyProcessStartForm, type MyProcessStartFormArgs } from '../my-form/my-process-start-form';
import { MyTaskForm, type MyTaskFormArgs } from '../my-form/my-task-form';
import { ProcessStartFormMessageMetadata, TaskFormMessageMetadata } from '@ailaflow/shared';

export interface MyChatMessageActions {
  openProcessStartForm(args: MyProcessStartFormArgs): void;
  openTaskForm(args: MyTaskFormArgs): void;
}

export function messageRenderer(
  actions: MyChatMessageActions,
  id: number,
  completedMessage: CompletedChatMessage,
  completedMessageIndex: number,
  sessionToken: string,
  testUserName?: string
) {
  const finished = completedMessage.metadata?.['finished'] === true;
  const startForm = completedMessage.metadata?.['processStartForm'] as ProcessStartFormMessageMetadata | undefined;
  if (typeof startForm === 'object' && startForm) {
    if (finished) {
      return <FormMessageView title="Form">Finished</FormMessageView>;
    }

    const args: MyProcessStartFormArgs = {
      processName: startForm.name,
      testUserName,
      chatSession: {
        token: sessionToken,
        messageId: id,
        completedMessageIndex
      }
    };
    return (
      <FormMessageView
        title="Form"
        lockedClickLabel={`Open start form for process ${startForm.name}`}
        onLockedClick={() => actions.openProcessStartForm(args)}
      >
        <MyProcessStartForm args={args} />
      </FormMessageView>
    );
  }

  const taskForm = completedMessage.metadata?.['taskForm'] as TaskFormMessageMetadata | undefined;
  if (taskForm) {
    if (finished) {
      return <FormMessageView title="Form">Finished</FormMessageView>;
    }

    const args: MyTaskFormArgs = { taskId: taskForm.id, testUserName };
    return (
      <FormMessageView title="Form" lockedClickLabel="Open task form" onLockedClick={() => actions.openTaskForm(args)}>
        <MyTaskForm args={args} />
      </FormMessageView>
    );
  }

  return null;
}
