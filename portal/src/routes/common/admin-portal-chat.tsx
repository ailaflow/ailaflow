import { RestoreChatRequest, ToolCall, ToolDescriptor } from '@aila/model';
import { useAiBindings } from './ai-bindings/ai-bindings-context';
import { GenericChat } from './generic-chat';
import { fnv1a } from '../../core/fnv1a';
import { useEffect, useMemo } from 'react';

export function AdminPortalChat() {
  const bindings = useAiBindings();
  const request: RestoreChatRequest = useMemo(() => {
    const frontendToolDescriptors: ToolDescriptor[] = bindings.stores
      .map(s => s.bindings)
      .flat()
      .map(b => ({
        function: b.descriptor,
        type: 'function'
      }));
    const hash = fnv1a(frontendToolDescriptors);
    return {
      admin: { frontendToolDescriptors, hash }
    };
  }, [bindings]);

  async function resolveToolCall(_abortSignal: AbortSignal, toolCall: ToolCall): Promise<object | null> {
    const store = bindings.stores.find(s => s.functionNames.has(toolCall.function.name));
    if (store) {
      const setter = store.tryGet();
      if (setter) {
        const arg = JSON.parse(toolCall.function.arguments);
        return setter[toolCall.function.name](arg);
      } else {
        return { error: store.notAvailableMessage };
      }
    }
    return null;
  }

  useEffect(
    () =>
      bindings.global.bind({
        get_current_page: async () => {
          return {
            page: 'sandbox_editor'
          };
        }
      }),
    [bindings.global]
  );

  return <GenericChat request={request} onFrontendToolCalls={resolveToolCall} />;
}
