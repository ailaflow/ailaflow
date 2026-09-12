import { Chat } from '@aibindkit/react';
import { useAiEnvironment, useAiStore } from './admin-portal';
import { useApiClient, useSession } from '../../auth/auth-context';
import { ChatMessageType } from '@aibindkit/core';
import { ChatMessageMetadata } from '@aibindkit/core';

const SESSION_KEY = 'admin:*';

export function AdminPortalChat() {
  const api = useApiClient();
  const { toolDescriptors, frontEndToolCallsHandler } = useAiEnvironment();
  const session = useSession();

  useAiStore('global', store => store.bind({}), []);

  return (
    <Chat
      transport={api.chat}
      sessionKey={SESSION_KEY}
      messageFilter={messageFilter}
      frontendTools={toolDescriptors}
      frontEndToolCallsHandler={frontEndToolCallsHandler}
    />
  );
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
