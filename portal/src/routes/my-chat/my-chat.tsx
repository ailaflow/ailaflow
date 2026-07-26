import { GenericChat } from '@aibindkit/react';
import { Portal } from '../common/portal';
import { useApiClient } from '../../auth/auth-context';
import { useMemo } from 'react';
import { MessageType } from '@aibindkit/core';
import { MessageMetadata } from '@aibindkit/core';

function messageFilter(type: MessageType, metadata?: MessageMetadata) {
  if (type === MessageType.SYSTEM) {
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
      <GenericChat
        transport={api.chat}
        params={details.params}
        frontendTools={details.frontendTools}
        frontEndToolCallsHandler={details.frontEndToolCallsHandler}
        messageFilter={messageFilter}
      />
    </Portal>
  );
}
