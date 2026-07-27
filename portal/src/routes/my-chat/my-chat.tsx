import { Chat } from '@aibindkit/react';
import { Portal } from '../common/portal';
import { useApiClient } from '../../auth/auth-context';
import { useMemo } from 'react';
import { ChatMessageType } from '@aibindkit/core';
import { ChatMessageMetadata } from '@aibindkit/core';
import { FormMessage } from './form-message';
import { CompletedChatMessage } from '@aibindkit/core';

function messageRenderer(
  id: number,
  _: ChatMessageType,
  completedMessage: CompletedChatMessage,
  completedMessageIndex: number,
  sessionToken: string
) {
  const startForm = completedMessage.metadata?.['startForm'] as {
    processName: string;
  };
  const finished = completedMessage.metadata?.['finished'] as true | undefined;
  if (typeof startForm === 'object' && startForm) {
    return (
      <FormMessage
        processName={startForm.processName}
        completedMessageIndex={completedMessageIndex}
        messageId={id}
        sessionToken={sessionToken}
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

export function MyChat() {
  const api = useApiClient();

  const details = useMemo(
    () => ({
      params: {
        name: 'main'
      },
      frontendTools: [],
      frontEndToolCallsHandler: async () => null
    }),
    []
  );

  return (
    <Portal>
      <Chat
        transport={api.chat}
        params={details.params}
        frontendTools={details.frontendTools}
        frontEndToolCallsHandler={details.frontEndToolCallsHandler}
        messageFilter={messageFilter}
        messageRenderer={messageRenderer}
      />
    </Portal>
  );
}
