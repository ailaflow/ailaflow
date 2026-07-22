import { GenericChat } from '@aibindkit/react';
import { useAiEnvironment, useAiStore } from './admin-portal';
import { useApiClient, useSession } from '../../auth/auth-context';
import { useMemo } from 'react';

export function AdminPortalChat() {
  const api = useApiClient();
  const { toolDescriptors, handleToolCall } = useAiEnvironment();
  const params = useMemo(() => ({ admin: true }), []);
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

  return <GenericChat transport={api.chat} params={params} frontendTools={toolDescriptors} onFrontendToolCalls={handleToolCall} />;
}
