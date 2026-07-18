import { GenericChat } from '@aibindkit/react';
import { useAiEnvironment, useAiStore } from './admin-portal';
import { useApiClient, useSession } from '../../auth/auth-context';
import { useMemo } from 'react';

export function AdminPortalChat() {
  const api = useApiClient();
  const { toolDescriptors, handleToolCall } = useAiEnvironment();
  const channel = useMemo(() => ({ admin: true }), []);
  const session = useSession();

  useAiStore(
    'global',
    store =>
      store.bind({
        getCurrentUser: async () => ({
          userName: session.userName
        })
      }),
    []
  );

  return <GenericChat transport={api.chat} channel={channel} frontendTools={toolDescriptors} onFrontendToolCalls={handleToolCall} />;
}
