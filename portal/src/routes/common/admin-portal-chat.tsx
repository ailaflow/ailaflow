import { Chat } from '@aibindkit/react';
import { useAiEnvironment, useAiStore } from './admin-portal';
import { useApiClient, useSession } from '../../auth/auth-context';

const CHANNEL_NAME = 'admin';

export function AdminPortalChat() {
  const api = useApiClient();
  const { toolDescriptors, frontEndToolCallsHandler } = useAiEnvironment();
  const session = useSession();

  useAiStore(
    'global',
    store =>
      store.bind({
        async getCurrentUser() {
          return {
            userName: session.userName
          };
        },
        async getSandboxes() {
          const abortSignal = AbortSignal.timeout(3_000);
          return api.sandbox.getSandboxes(abortSignal);
        },
        async getTables() {
          const abortSignal = AbortSignal.timeout(3_000);
          const page = await api.table.getTables(abortSignal, {
            page: 1,
            pageSize: 100
          });
          return page.tables;
        }
      }),
    []
  );

  return (
    <Chat
      transport={api.chat}
      channelName={CHANNEL_NAME}
      frontendTools={toolDescriptors}
      frontEndToolCallsHandler={frontEndToolCallsHandler}
    />
  );
}
