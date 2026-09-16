import type { CompletedChatMessage } from '@aibindkit/core';
import { FormMessageView } from '../../../views/my-chat/form-message-view';
import { MyProcessStartForm, type MyProcessStartFormArgs } from '../my-form/my-process-start-form';
import { MyTaskForm, type MyTaskFormArgs } from '../my-form/my-task-form';

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
  const startForm = completedMessage.metadata?.['startForm'] as { processName: string } | undefined;
  if (typeof startForm === 'object' && startForm) {
    if (finished) {
      return <FormMessageView title="Form">Finished</FormMessageView>;
    }

    const args: MyProcessStartFormArgs = {
      processName: startForm.processName,
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
        lockedClickLabel={`Open start form for process ${startForm.processName}`}
        onLockedClick={() => actions.openProcessStartForm(args)}
      >
        <MyProcessStartForm args={args} />
      </FormMessageView>
    );
  }

  const taskId = completedMessage.metadata?.['taskId'] as string | undefined;
  if (taskId) {
    if (finished) {
      return <FormMessageView title="Form">Finished</FormMessageView>;
    }

    const args: MyTaskFormArgs = { taskId, testUserName };
    return (
      <FormMessageView title="Form" lockedClickLabel="Open task form" onLockedClick={() => actions.openTaskForm(args)}>
        <MyTaskForm args={args} />
      </FormMessageView>
    );
  }

  return null;
}
