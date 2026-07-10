import { RestoreChatRequest } from '@aila/model';
import { GenericChat } from './generic-chat';
import { fnv1a } from '../../core/fnv1a';
import { useMemo } from 'react';
import { useAiEnvironment } from './admin-portal';

export function AdminPortalChat() {
  const { toolDescriptors, handleToolCall } = useAiEnvironment();

  const request: RestoreChatRequest = useMemo(() => {
    const hash = fnv1a(toolDescriptors);
    return {
      admin: { frontendToolDescriptors: toolDescriptors, hash }
    };
  }, [toolDescriptors]);

  return <GenericChat request={request} onFrontendToolCalls={handleToolCall} />;
}
