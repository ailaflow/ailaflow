import type { ToolCall } from '@aibindkit/model';
import { ChatUpdate, MessageChatUpdate, RestoreChatRequest, SendFrontendToolResultRequest } from '@aila/model';
import { useApiClient } from '../../auth/auth-context';
import { useEffect, useState } from 'react';
import { HttpClientSseListener } from '../../auth/http-client';
import { GenericChatView } from '../../views/generic-chat/generic-chat-view';

export interface GenericChatProps {
  request: RestoreChatRequest;
  onFrontendToolCalls(abortSignal: AbortSignal, toolCalls: ToolCall): Promise<object | null>;
}

export function GenericChat(props: GenericChatProps) {
  const apiClient = useApiClient();
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [updates, setUpdates] = useState<MessageChatUpdate[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const abrotController = new AbortController();

    async function resolveToolCalls(toolCalls: ToolCall[]) {
      const resolvedIds = new Set<string>();
      try {
        const toReturn: SendFrontendToolResultRequest[] = [];
        for (const toolCall of toolCalls) {
          const result = await props.onFrontendToolCalls(abrotController.signal, toolCall);
          if (result !== null) {
            toReturn.push({
              callId: toolCall.id,
              result: JSON.stringify(result)
            });
          }
        }

        for (const r of toReturn) {
          await apiClient.chat.sendFrontendToolResult(abrotController.signal, r);
          resolvedIds.add(r.callId);
        }
      } catch (e) {
        const error = (e as Error)?.message ?? String(e);
        for (const toolCall of toolCalls) {
          if (resolvedIds.has(toolCall.id)) {
            continue;
          }
          try {
            await apiClient.chat.sendFrontendToolResult(abrotController.signal, {
              callId: toolCall.id,
              result: `Error executing tool call: ${error}`
            });
          } catch (e) {
            console.warn(e);
          }
        }
      }
    }

    const listener: HttpClientSseListener<ChatUpdate> = {
      onMessage(update) {
        console.log(update);
        if (update.hello) {
          setChatSessionId(update.hello.chatSessionId);
        }
        if (update.messages) {
          setUpdates(u => [...u, ...update.messages!]);
        }
        if (update.currentMessage) {
          const currentMessage = update.currentMessage;
          setUpdates(u => {
            const current = u.find(m => m.id === currentMessage.id);
            if (current) {
              Object.assign(current, update.currentMessage);
              return [...u];
            } else {
              const toolCalls = tryGetToolCalls(currentMessage);
              if (toolCalls) {
                resolveToolCalls(toolCalls);
              }
              return [...u, update.currentMessage!];
            }
          });
        }
      },
      onClose() {}
    };

    apiClient.chat.restoreChat(abrotController.signal, listener, props.request);

    return () => abrotController.abort();
  }, [props.request]);

  async function onSendMessage() {
    if (!chatSessionId || !message) {
      return;
    }
    const abortSignal = AbortSignal.timeout(3_000);
    await apiClient.chat.sendChatMessage(abortSignal, {
      chatSessionId,
      message
    });
    setMessage('');
  }

  return <GenericChatView updates={updates} message={message} onMessageChanged={setMessage} onSendMessage={onSendMessage} />;
}

function tryGetToolCalls(update: MessageChatUpdate): ToolCall[] | null {
  if (update.completedMessage && !Array.isArray(update.completedMessage) && update.completedMessage.role === 'assistant') {
    const toolCalls = (update.completedMessage.tool_calls ?? []).filter(t => t.type === 'function');
    if (toolCalls.length > 0) {
      return toolCalls;
    }
  }
  return null;
}
