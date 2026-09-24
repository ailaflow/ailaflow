import { Chat } from '@aibindkit/react';
import { useAiEnvironment, useAiStore } from './admin-portal';
import { useApiClient, useSession } from '../../auth/auth-context';
import { ChatMessageType } from '@aibindkit/core';
import { ChatMessageMetadata } from '@aibindkit/core';

const SESSION_KEY = 'admin:*';

export function AdminPortalChat() {
  const session = useSession();
  const apiClient = useApiClient();
  const { toolDescriptors, frontEndToolCallsHandler } = useAiEnvironment();

  useAiStore('global', store => store.bind({}), []);

  return (
    <Chat
      assistantName="Aila"
      userName={`@${session.userName}`}
      transport={apiClient.chat}
      sessionKey={SESSION_KEY}
      messageFilter={messageFilter}
      frontendTools={toolDescriptors}
      frontEndToolCallsHandler={frontEndToolCallsHandler}
      emptyTitle="Hello, I’m your Admin Assistant"
      emptyText="What would you like to build or change?"
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
