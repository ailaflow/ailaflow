import type { ChatUpdate, MessageChatUpdate, RestoreChatRequest, SendFrontendToolResultRequest, ToolCall } from '@aibindkit/model';
import { useEffect, useMemo, useState } from 'react';
import { GenericChatView } from './generic-chat-view';
import type { SendChatMessageRequest, SendChatMessageResponse, ToolDescriptor } from '@aibindkit/model';

export interface ChatTransportListener {
  onMessage(data: ChatUpdate): void;
  onClose(error?: Error): void;
}

export interface ChatTransport {
  restoreChat(abortSignal: AbortSignal, listener: ChatTransportListener, request: RestoreChatRequest): Promise<void>;
  sendChatMessage(abortSignal: AbortSignal, request: SendChatMessageRequest): Promise<SendChatMessageResponse>;
  sendFrontendToolResult(abortSignal: AbortSignal, request: SendFrontendToolResultRequest): Promise<void>;
}

export interface GenericChatProps {
  transport: ChatTransport;
  frontendTools: ToolDescriptor[];
  channel: Record<string, unknown>;
  onFrontendToolCalls(abortSignal: AbortSignal, toolCalls: ToolCall): Promise<object | null>;
}

export function GenericChat(props: GenericChatProps) {
  const request = useMemo<RestoreChatRequest>(
    () => ({
      channel: props.channel,
      frontendTools: props.frontendTools,
      frontendToolsHash: fnv1a(props.frontendTools)
    }),
    [props.frontendTools, props.channel]
  );
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [updates, setUpdates] = useState<MessageChatUpdate[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const abortController = new AbortController();

    async function resolveToolCalls(toolCalls: ToolCall[]) {
      const resolvedIds = new Set<string>();
      try {
        const toReturn: SendFrontendToolResultRequest[] = [];
        for (const toolCall of toolCalls) {
          const result = await props.onFrontendToolCalls(abortController.signal, toolCall);
          if (result !== null) {
            toReturn.push({
              callId: toolCall.id,
              result: JSON.stringify(result)
            });
          }
        }

        for (const r of toReturn) {
          await props.transport.sendFrontendToolResult(abortController.signal, r);
          resolvedIds.add(r.callId);
        }
      } catch (e) {
        const error = (e as Error)?.message ?? String(e);
        for (const toolCall of toolCalls) {
          if (resolvedIds.has(toolCall.id)) {
            continue;
          }
          try {
            await props.transport.sendFrontendToolResult(abortController.signal, {
              callId: toolCall.id,
              result: `Error executing tool call: ${error}`
            });
          } catch (e) {
            console.warn(e);
          }
        }
      }
    }

    const listener: ChatTransportListener = {
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

    props.transport.restoreChat(abortController.signal, listener, request);

    return () => abortController.abort();
  }, [request, props.transport]);

  async function onSendMessage() {
    if (!chatSessionId || !message) {
      return;
    }
    const abortSignal = AbortSignal.timeout(3_000);
    await props.transport.sendChatMessage(abortSignal, {
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

function fnv1a(input: string | object): string {
  if (typeof input === 'object') {
    input = JSON.stringify(input);
  }
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
