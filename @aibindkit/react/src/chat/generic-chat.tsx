import {
  type ChatTransport,
  type ToolDescriptor,
  type MessageChatUpdate,
  type RestoreChatRequest,
  type ToolCall,
  type ChatTransportListener,
  fnv1a,
  MessageType,
  ChatUpdate
} from '@aibindkit/core';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { GenericChatView } from './generic-chat-view';
import { ChatToolCallsHandler, FrontEndToolCallsHandler } from './chat-tool-calls-handler';

export interface GenericChatProps {
  transport: ChatTransport;
  frontendTools: ToolDescriptor[];
  params: Record<string, unknown>;
  skipSystemPrompt?: boolean;
  frontEndToolCallsHandler: FrontEndToolCallsHandler;
}

interface GenericChatState {
  skipSystemPrompt: boolean;
  lastUpdate: ChatUpdate | null;
  isLoading: boolean;
  isWorking: boolean;
  connectionError: string | null;
  messages: (MessageChatUpdate & { type: MessageType })[];
}

export function GenericChat(props: GenericChatProps) {
  const request = useMemo(
    () =>
      ({
        params: props.params,
        frontendTools: props.frontendTools,
        frontendToolsHash: fnv1a(props.frontendTools)
      }) satisfies RestoreChatRequest,
    [props.params, props.frontendTools]
  );
  const sessionToken = useRef<string | null>(null);

  const lastHandledToolCallId = useRef<number>(-1);
  const pendingToolAbortControllers = useRef(new Set<AbortController>());

  const toolCallsHandler = useMemo<ChatToolCallsHandler>(
    () => new ChatToolCallsHandler(props.transport, props.frontEndToolCallsHandler),
    [props.transport, props.frontEndToolCallsHandler]
  );

  const [reconnectKey, setReconnectKey] = useState(0);
  const [message, setMessage] = useState('');
  const [state, dispatch] = useReducer(
    (currentState: GenericChatState, update: ChatUpdate & { isLoading?: boolean; connectionError?: string | null }): GenericChatState => {
      const canInclude = (m: MessageChatUpdate) => !currentState.skipSystemPrompt || m.type !== MessageType.SYSTEM;
      const state: GenericChatState = { ...currentState };
      state.lastUpdate = update;
      if (update.hello) {
        state.isLoading = false;
      }
      if (update.isReset) {
        state.messages = [];
      }
      if (update.restoredMessages) {
        state.messages = update.restoredMessages.filter(canInclude);
      }
      if (update.currentMessage && canInclude(update.currentMessage)) {
        const id = update.currentMessage.id;
        let finalMessage: MessageChatUpdate;
        const index = state.messages.findIndex(m => m.id === id);
        if (index >= 0) {
          finalMessage = { ...state.messages[index], ...update.currentMessage };
          state.messages = [...state.messages];
          state.messages[index] = finalMessage;
        } else {
          finalMessage = update.currentMessage;
          state.messages = [...state.messages, finalMessage];
        }
      }
      if (update.isLoading !== undefined) {
        state.isLoading = update.isLoading;
      }
      if (update.isWorking !== undefined) {
        state.isWorking = update.isWorking;
      }
      if (update.connectionError !== undefined) {
        state.connectionError = update.connectionError;
      }
      return state;
    },
    undefined,
    () => ({
      skipSystemPrompt: props.skipSystemPrompt ?? false,
      lastUpdate: null,
      isLoading: false,
      isWorking: false,
      lastToolMessageId: null,
      tools: null,
      connectionError: null,
      messages: []
    })
  );

  useEffect(() => {
    if (!sessionToken.current) {
      return;
    }
    if (state.lastUpdate?.isReset) {
      lastHandledToolCallId.current = -1;
      return;
    }
    if (state.lastUpdate?.restoredMessages) {
      const restoredMessageIds = state.lastUpdate.restoredMessages.map(m => m.id);
      lastHandledToolCallId.current = Math.max(-1, ...restoredMessageIds);
    }

    const pendingCalls: ToolCall[] = [];
    for (const message of state.messages) {
      if (message.id > lastHandledToolCallId.current) {
        const calls = tryGetToolCalls(message);
        if (calls) {
          pendingCalls.push(...calls);
          lastHandledToolCallId.current = message.id;
        }
      }
    }
    if (pendingCalls.length > 0) {
      const abortController = new AbortController();
      pendingToolAbortControllers.current.add(abortController);
      toolCallsHandler
        .handle(abortController.signal, pendingCalls, sessionToken.current)
        .finally(() => pendingToolAbortControllers.current.delete(abortController));
    }
  }, [state.lastUpdate && state.messages, toolCallsHandler]);

  useEffect(
    () => () => {
      // We abort any pending tool calls when the component is unmounted.
      for (const controller of pendingToolAbortControllers.current) {
        controller.abort();
      }
    },
    []
  );

  useEffect(() => {
    const abortController = new AbortController();

    const listener: ChatTransportListener = {
      onMessage(update) {
        if (update.hello) {
          sessionToken.current = update.hello.sessionToken;
        }
        dispatch(update);
      },
      onClose(e) {
        if (!abortController.signal.aborted) {
          const connectionError = e?.message ?? 'Connection closed';
          dispatch({ isLoading: false, connectionError });
        }
      }
    };

    async function connect() {
      dispatch({ isLoading: true });
      try {
        await props.transport.restoreChat(abortController.signal, listener, request);
      } catch (e) {
        const connectionError = (e as Error)?.message ?? String(e);
        dispatch({ isLoading: false, connectionError });
      }
    }

    connect();
    return () => abortController.abort();
  }, [request, reconnectKey, props.transport, props.skipSystemPrompt]);

  async function onSendMessage() {
    if (sessionToken.current && message.length > 0) {
      const abortSignal = AbortSignal.timeout(3_000);
      await props.transport.sendChatMessage(abortSignal, {
        sessionToken: sessionToken.current,
        message
      });
      setMessage('');
    }
  }

  async function onStopClicked() {
    if (sessionToken.current && state.isWorking) {
      const abortSignal = AbortSignal.timeout(3_000);
      await props.transport.interruptChat(abortSignal, {
        sessionToken: sessionToken.current
      });
    }
  }

  async function onStartNewConversation() {
    if (sessionToken.current) {
      const abortSignal = AbortSignal.timeout(3_000);
      await props.transport.restartChat(abortSignal, {
        sessionToken: sessionToken.current
      });
    }
  }

  function onReconnectClicked() {
    dispatch({ isLoading: true, connectionError: null });
    setReconnectKey(k => k + 1);
    sessionToken.current = null;
  }

  return (
    <GenericChatView
      isLoading={state.isLoading}
      isWorking={state.isWorking}
      connectionError={state.connectionError}
      messages={state.messages}
      message={message}
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
