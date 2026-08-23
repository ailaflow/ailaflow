import { CompletedChatMessage } from '@aibindkit/core';
import { ChatMessageType } from '@aibindkit/core';
import { StartFormMessage } from './start-form-message';
import { TaskFormMessage } from './task-form-message';
import { ChatMessageMetadata } from '@aibindkit/core';
import { Chat } from '@aibindkit/react';
import { useApiClient } from '../../../auth/auth-context';

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

export interface MyChatProps {
  channelName: string;
}

export function MyChat(props: MyChatProps) {
  const api = useApiClient();

  return <Chat transport={api.chat} channelName={props.channelName} messageFilter={messageFilter} messageRenderer={messageRenderer} />;
}
