import type {
  ChatTransport,
  ToolDescriptor,
  MessageChatUpdate,
  RestoreChatRequest,
  SendFrontendToolResultRequest,
  ToolCall,
  ChatTransportListener
} from '@aibindkit/core';
import { useEffect, useMemo, useState } from 'react';
import { GenericChatView } from './generic-chat-view';
import { fnv1a } from './fnv1a';

export interface GenericChatProps {
  transport: ChatTransport;
  frontendTools: ToolDescriptor[];
  channel: Record<string, unknown>;
  skipSystemPrompt?: boolean;
  onFrontendToolCalls(abortSignal: AbortSignal, toolCalls: ToolCall): Promise<object | null>;
}

export function GenericChat(props: GenericChatProps) {
  const request = useMemo(
    () =>
      ({
        channel: props.channel,
        frontendTools: props.frontendTools,
        frontendToolsHash: fnv1a(props.frontendTools),
        skipSystemPrompt: props.skipSystemPrompt
      }) satisfies RestoreChatRequest,
    [props.channel, props.frontendTools]
  );

  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectKey, setReconnectKey] = useState(0);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [updates, setUpdates] = useState<MessageChatUpdate[]>([]);
  const [isWorking, setIsWorking] = useState(false);
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
        if (update.hello) {
          setChatSessionId(update.hello.chatSessionId);
        }
        if (update.messages) {
          setUpdates(u => [...u, ...update.messages!]);
        }
        if (update.currentMessage) {
          const currentMessage = update.currentMessage;
          setUpdates(u => {
            const index = u.findIndex(m => m.id === currentMessage.id);
            if (index >= 0) {
              u[index] = currentMessage;
              return [...u];
            }

            const toolCalls = tryGetToolCalls(currentMessage);
            if (toolCalls) {
              void resolveToolCalls(toolCalls);
            }
            return [...u, currentMessage];
          });
        }
        if (update.isWorking !== undefined) {
          setIsWorking(update.isWorking);
        }
      },
      onClose(e) {
        const error = e?.message ?? 'Connection closed';
        setConnectionError(error);
      }
    };

    async function connect() {
      try {
        await props.transport.restoreChat(abortController.signal, listener, request);
      } catch (e) {
        const error = (e as Error)?.message ?? String(e);
        setConnectionError(error);
      }
    }

    connect();
    return () => abortController.abort();
  }, [request, reconnectKey, props.transport]);

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

  async function onStopClicked() {
    if (!chatSessionId || !isWorking) {
      return;
    }
    const abortSignal = AbortSignal.timeout(3_000);
    await props.transport.interruptChat(abortSignal, {
      chatSessionId
    });
  }

  async function onStartNewConversation() {
    if (!chatSessionId) {
      return;
    }
    const abortSignal = AbortSignal.timeout(3_000);
    await props.transport.restartChat(abortSignal, {
      chatSessionId
    });
    setUpdates([]);
    setIsWorking(false);
  }

  function onReconnectClicked() {
    setConnectionError(null);
    setChatSessionId(null);
    setReconnectKey(k => k + 1);
  }

  return (
    <GenericChatView
      isLoading={chatSessionId === null}
      isWorking={isWorking}
      updates={updates}
      message={message}
      connectionError={connectionError}
      onReconnectClicked={onReconnectClicked}
      onMessageChanged={setMessage}
      onSendMessage={onSendMessage}
      onStopClicked={onStopClicked}
      onStartNewConversation={onStartNewConversation}
    />
  );
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
