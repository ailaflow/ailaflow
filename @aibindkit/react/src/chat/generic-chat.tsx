import {
  type ChatTransport,
  type ToolDescriptor,
  type MessageChatUpdate,
  type RestoreChatRequest,
  type SendFrontendToolResultRequest,
  type ToolCall,
  type ChatTransportListener,
  fnv1a,
  MessageType
} from '@aibindkit/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GenericChatView } from './generic-chat-view';

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
        frontendToolsHash: fnv1a(props.frontendTools)
      }) satisfies RestoreChatRequest,
    [props.channel, props.frontendTools]
  );

  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [reconnectKey, setReconnectKey] = useState(0);
  const sessionId = useRef<string | null>(null);
  const [updates, setUpdates] = useState<MessageChatUpdate[]>([]);
  const [isWorking, setIsWorking] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const abortController = new AbortController();

    function canInclude(update: MessageChatUpdate) {
      return !props.skipSystemPrompt || update.type !== MessageType.SYSTEM;
    }

    async function resolveToolCalls(toolCalls: ToolCall[]) {
      if (!sessionId.current) {
        throw new Error('Session ID is not set');
      }
      const resolvedIds = new Set<string>();
      try {
        const toReturn: SendFrontendToolResultRequest[] = [];
        for (const toolCall of toolCalls) {
          const result = await props.onFrontendToolCalls(abortController.signal, toolCall);
          if (result !== null) {
            toReturn.push({
              sessionId: sessionId.current,
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
              sessionId: sessionId.current,
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
          sessionId.current = update.hello.sessionId;
        }
        if (update.messages) {
          const messages = update.messages.filter(m => canInclude(m));
          setUpdates(u => [...u, ...messages]);
        }
        if (update.currentMessage && canInclude(update.currentMessage)) {
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
  }, [request, reconnectKey, props.transport, props.skipSystemPrompt]);

  async function onSendMessage() {
    if (!sessionId.current || !message) {
      return;
    }
    const abortSignal = AbortSignal.timeout(3_000);
    await props.transport.sendChatMessage(abortSignal, {
      sessionId: sessionId.current,
      message
    });
    setMessage('');
  }

  async function onStopClicked() {
    if (!sessionId.current || !isWorking) {
      return;
    }
    const abortSignal = AbortSignal.timeout(3_000);
    await props.transport.interruptChat(abortSignal, {
      sessionId: sessionId.current
    });
  }

  async function onStartNewConversation() {
    if (!sessionId.current) {
      return;
    }
    const abortSignal = AbortSignal.timeout(3_000);
    await props.transport.restartChat(abortSignal, {
      sessionId: sessionId.current
    });
    setUpdates([]);
    setIsWorking(false);
  }

  function onReconnectClicked() {
    setConnectionError(null);
    setReconnectKey(k => k + 1);
    sessionId.current = null;
  }

  return (
    <GenericChatView
      isLoading={sessionId === null}
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
  if (update.type === MessageType.AI && update.completedMessages) {
    const result: ToolCall[] = [];
    for (const cm of update.completedMessages) {
      if (cm.role === 'assistant') {
        const calls = (cm.tool_calls ?? []).filter(t => t.type === 'function');
        result.push(...calls);
      }
    }
    if (result.length > 0) {
      return result;
    }
  }
  return null;
}
