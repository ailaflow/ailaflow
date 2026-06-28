import { RestoreChatRequest } from '@aila/model';
import { useAiBindings } from './ai-bindings/ai-bindings-context';
import { GenericChat } from './generic-chat';
import { fnv1a } from '../../core/fnv1a';
import { useMemo } from 'react';

export function AdminPortalChat() {
  const { toolDescriptors, handleToolCall } = useAiBindings();

  const request: RestoreChatRequest = useMemo(() => {
    const hash = fnv1a(toolDescriptors);
    return {
      admin: { frontendToolDescriptors: toolDescriptors, hash }
    };
  }, [toolDescriptors]);

  return <GenericChat request={request} onFrontendToolCalls={handleToolCall} />;
}
