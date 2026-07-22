import { GenericChat, toolError } from '@aibindkit/react';
import { Portal } from '../common/portal';
import { useApiClient } from '../../auth/auth-context';
import { useMemo } from 'react';

export function MyChat() {
  const api = useApiClient();

  const details = useMemo(
    () => ({
      params: {
        name: 'Main'
      },
      frontendTools: [],
      onFrontendToolCalls: async () => toolError('Not supported')
    }),
    []
  );

  return (
    <Portal>
      <GenericChat
        transport={api.chat}
        params={details.params}
        frontendTools={details.frontendTools}
        onFrontendToolCalls={details.onFrontendToolCalls}
        skipSystemPrompt={true}
      />
    </Portal>
  );
}
