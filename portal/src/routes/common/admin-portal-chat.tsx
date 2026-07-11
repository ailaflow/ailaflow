import { GenericChat } from '@aibindkit/react';
import { useAiEnvironment } from './admin-portal';
import { useApiClient } from '../../auth/auth-context';
import { useMemo } from 'react';

export function AdminPortalChat() {
  const api = useApiClient();
  const { toolDescriptors, handleToolCall } = useAiEnvironment();
  const channel = useMemo(() => ({ admin: true }), []);

  return <GenericChat transport={api.chat} channel={channel} frontendTools={toolDescriptors} onFrontendToolCalls={handleToolCall} />;
}
