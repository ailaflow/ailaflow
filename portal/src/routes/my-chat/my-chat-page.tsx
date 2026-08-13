import { Chat } from '@aibindkit/react';
import { Portal } from '../common/portal';
import { useApiClient } from '../../auth/auth-context';
import { useMemo } from 'react';
import { ChatMessageType } from '@aibindkit/core';
import { ChatMessageMetadata } from '@aibindkit/core';
import { StartFormMessage } from './start-form-message';
import { CompletedChatMessage } from '@aibindkit/core';
import { TaskFormMessage } from './task-form-message';

const CHANNEL_NAME = 'default';

function messageRenderer(
  id: number,
  _: ChatMessageType,
  completedMessage: CompletedChatMessage,
  completedMessageIndex: number,
  sessionToken: string
) {
  const finished = completedMessage.metadata?.['finished'] === true;
  const startForm = completedMessage.metadata?.['startForm'] as {
    processName: string;
  };
  if (typeof startForm === 'object' && startForm) {
    return (
      <StartFormMessage
        processName={startForm.processName}
        completedMessageIndex={completedMessageIndex}
        messageId={id}
        sessionToken={sessionToken}
        finished={finished}
      />
    );
  }

  const taskForm = completedMessage.metadata?.['taskForm'] as {
    taskId: string;
  };
  if (typeof taskForm === 'object' && taskForm) {
    return (
      <TaskFormMessage
        taskId={taskForm.taskId}
        sessionToken={sessionToken}
        messageId={id}
        completedMessageIndex={completedMessageIndex}
        finished={finished}
      />
    );
  }
  return null;
}

function messageFilter(type: ChatMessageType, metadata?: ChatMessageMetadata) {
  if (type === ChatMessageType.SYSTEM) {
    return false;
  }
  if (metadata?.['internal'] === true) {
    return false;
  }
  return true;
}

export function MyChatPage() {
  const api = useApiClient();

  const details = useMemo(
    () => ({
      frontendTools: [],
      frontEndToolCallsHandler: async () => null
    }),
    []
  );

  return (
    <Portal>
      <Chat
        transport={api.chat}
        channelName={CHANNEL_NAME}
        frontendTools={details.frontendTools}
        frontEndToolCallsHandler={details.frontEndToolCallsHandler}
        messageFilter={messageFilter}
        messageRenderer={messageRenderer}
      />
    </Portal>
  );
}
