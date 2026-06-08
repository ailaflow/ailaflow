import { RestoreChatRequest, ToolCall, ToolDescriptor } from '@aila/model';
import { useAiBindings } from './ai-bindings/ai-bindings-context';
import { GenericChat } from './generic-chat';
import { fnv1a } from '../../core/fnv1a';
import { useMemo } from 'react';

export function AdminPortalChat() {
  const bindings = useAiBindings();
  const admin: RestoreChatRequest['admin'] = useMemo(() => {
    const frontendToolDescriptors: ToolDescriptor[] = bindings.stores
      .map(s => s.bindings)
      .flat()
      .map(b => ({
        function: b.descriptor,
        type: 'function'
      }));
    const hash = fnv1a(frontendToolDescriptors);
    return { frontendToolDescriptors, hash };
  }, [bindings]);

  async function resolveToolCall(_abortSignal: AbortSignal, toolCall: ToolCall): Promise<string | null> {
    console.log('resolveToolCall', toolCall);
    const store = bindings.stores.find(s => s.functionNames.has(toolCall.function.name));
    if (store) {
      const setter = store.tryGet();
      if (setter) {
        return setter[toolCall.function.name](toolCall.function.arguments);
      } else {
        return store.notAvailableMessage;
      }
    }
    return null;
  }

  return (
    <GenericChat
      restoreRequest={{
        admin
      }}
      onFrontendToolCalls={resolveToolCall}
    />
  );
}
