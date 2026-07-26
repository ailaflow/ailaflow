import {
  type ChatTransport,
  type ToolDescriptor,
  type ChatMessageUpdate,
  type RestoreChatRequest,
  type ToolCall,
  type ChatTransportListener,
  fnv1a,
  ChatUpdate,
  ChatMessageType
} from '@aibindkit/core';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ChatMessageFilter, ChatView } from './chat-view';
import { ChatToolCallsHandler, FrontEndToolCallsHandler } from './chat-tool-calls-handler';

export interface ChatProps {
  transport: ChatTransport;
  frontendTools: ToolDescriptor[];
  params: Record<string, unknown>;
  messageFilter?: ChatMessageFilter;
  frontEndToolCallsHandler: FrontEndToolCallsHandler;
}

interface ChatState {
  lastUpdate: ChatUpdate | null;
  isLoading: boolean;
  isWorking: boolean;
  connectionError: string | null;
  messages: ChatMessageUpdate[];
}

export function Chat(props: ChatProps) {
  const request = useMemo(
    () =>
      ({
        params: props.params,
        frontendTools: props.frontendTools,
        frontendToolsHash: fnv1a(props.frontendTools)
      }) satisfies RestoreChatRequest,
    [props.params, props.frontendTools]
  );
  const sessionTokenRef = useRef<string | null>(null);

  const lastHandledToolCallId = useRef<number>(-1);
  const pendingToolAbortControllers = useRef(new Set<AbortController>());

  const toolCallsHandler = useMemo<ChatToolCallsHandler>(
    () => new ChatToolCallsHandler(props.transport, props.frontEndToolCallsHandler),
    [props.transport, props.frontEndToolCallsHandler]
  );

  const [reconnectKey, setReconnectKey] = useState(0);
  const [message, setMessage] = useState('');
  const [state, dispatch] = useReducer(
    (currentState: ChatState, update: ChatUpdate & { isLoading?: boolean; connectionError?: string | null }): ChatState => {
      const state: ChatState = { ...currentState };
      state.lastUpdate = update;
      if (update.sessionToken) {
        state.isLoading = false;
      }
      if (update.isReset) {
        state.messages = [];
      }
      if (update.restoredMessages) {
        state.messages = update.restoredMessages;
      }
      if (update.currentMessage) {
        const id = update.currentMessage.id;
        let finalMessage: ChatMessageUpdate;
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
    if (!sessionTokenRef.current) {
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
        .handle(abortController.signal, pendingCalls, sessionTokenRef.current)
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
        if (update.sessionToken) {
          sessionTokenRef.current = update.sessionToken;
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
  }, [request, reconnectKey, props.transport]);

  async function onSendMessage() {
    if (sessionTokenRef.current && message.length > 0) {
      const abortSignal = AbortSignal.timeout(3_000);
      await props.transport.sendChatMessage(abortSignal, {
        sessionToken: sessionTokenRef.current,
        message
      });
      setMessage('');
    }
  }

  async function onStopClicked() {
    if (sessionTokenRef.current && state.isWorking) {
      const abortSignal = AbortSignal.timeout(3_000);
      await props.transport.interruptChat(abortSignal, {
        sessionToken: sessionTokenRef.current
      });
    }
  }

  async function onStartNewConversation() {
    if (sessionTokenRef.current) {
      const abortSignal = AbortSignal.timeout(3_000);
      await props.transport.restartChat(abortSignal, {
        sessionToken: sessionTokenRef.current
      });
    }
  }

  function onReconnectClicked() {
    dispatch({ isLoading: true, connectionError: null });
    setReconnectKey(k => k + 1);
    sessionTokenRef.current = null;
  }

  return (
    <ChatView
      isLoading={state.isLoading}
      isWorking={state.isWorking}
      connectionError={state.connectionError}
      messages={state.messages}
      message={message}
      messageFilter={props.messageFilter ?? defaultMessageFilter}
      onReconnectClicked={onReconnectClicked}
      onMessageChanged={setMessage}
      onSendMessage={onSendMessage}
      onStopClicked={onStopClicked}
      onStartNewConversation={onStartNewConversation}
    />
  );
}

function defaultMessageFilter(type: ChatMessageType): boolean {
  return type !== ChatMessageType.SYSTEM;
}

function tryGetToolCalls(update: ChatMessageUpdate): ToolCall[] | null {
  if (update.type === ChatMessageType.AI && update.completedMessages) {
    const result: ToolCall[] = [];
    for (const cm of update.completedMessages) {
      if (cm.message.role === 'assistant') {
        const calls = (cm.message.tool_calls ?? []).filter(t => t.type === 'function');
        result.push(...calls);
      }
    }
    if (result.length > 0) {
      return result;
    }
  }
  return null;
}
