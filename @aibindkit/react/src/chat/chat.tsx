import {
  type ChatTransport,
  type ToolDescriptor,
  type ChatMessageUpdate,
  type RestoreChatRequest,
  type ToolCall,
  type ChatTransportListener,
  fnv1a,
  ChatUpdate,
  ChatMessageType,
  ChatContextUsageUpdate
} from '@aibindkit/core';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ChatMessageFilter, ChatMessageRenderer, ChatView } from './chat-view';
import { ChatToolCallsHandler, FrontEndToolCallsHandler } from './chat-tool-calls-handler';

export interface ChatProps {
  transport: ChatTransport;
  frontendTools?: ToolDescriptor[];
  sessionKey: string;
  assistantName?: string;
  userName?: string;
  messageRenderer?: ChatMessageRenderer;
  messageFilter?: ChatMessageFilter;
  frontEndToolCallsHandler?: FrontEndToolCallsHandler;
}

interface ChatState {
  sessionToken: string | null;
  lastUpdate: ChatUpdate | null;
  contextUsage?: ChatContextUsageUpdate;
  isWorking: boolean;
  connectionError: string | null;
  messages: ChatMessageUpdate[];
}

export function Chat(props: ChatProps) {
  const request = useMemo((): RestoreChatRequest => {
    const frontendTools = props.frontendTools ?? [];
    return {
      sessionKey: props.sessionKey,
      frontendTools,
      frontendToolsHash: fnv1a(frontendTools)
    };
  }, [props.sessionKey, props.frontendTools]);

  const lastHandledToolCallId = useRef<number>(-1);
  const pendingToolAbortControllers = useRef(new Set<AbortController>());

  const toolCallsHandler = useMemo<ChatToolCallsHandler>(
    () => new ChatToolCallsHandler(props.transport, props.frontEndToolCallsHandler ?? (async () => null), console),
    [props.transport, props.frontEndToolCallsHandler]
  );

  const [reconnectKey, setReconnectKey] = useState(0);
  const [message, setMessage] = useState('');
  const [state, dispatch] = useReducer(
    (currentState: ChatState, update: ChatUpdate & { deleteSessionToken?: true; connectionError?: string | null }): ChatState => {
      const state: ChatState = { ...currentState };
      state.lastUpdate = update;
      if (update.sessionToken) {
        state.sessionToken = update.sessionToken;
      }
      if (update.deleteSessionToken) {
        state.sessionToken = null;
      }
      if (update.isReset) {
        state.messages = [];
        state.contextUsage =
          state.contextUsage?.contextWindow === undefined
            ? undefined
            : {
                percent: 0,
                contextWindow: state.contextUsage.contextWindow
              };
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
      if (update.isWorking !== undefined) {
        state.isWorking = update.isWorking;
      }
      if (update.contextUsage !== undefined) {
        state.contextUsage = update.contextUsage;
      }
      if (update.connectionError !== undefined) {
        state.connectionError = update.connectionError;
      }
      return state;
    },
    undefined,
    () => ({
      sessionToken: null,
      lastUpdate: null,
      isWorking: false,
      lastToolMessageId: null,
      tools: null,
      connectionError: null,
      messages: []
    })
  );

  useEffect(() => {
    if (!state.sessionToken) {
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
        .handle(abortController.signal, pendingCalls, state.sessionToken)
        .finally(() => pendingToolAbortControllers.current.delete(abortController));
    }
  }, [state.sessionToken, state.lastUpdate && state.messages, toolCallsHandler]);

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
        dispatch(update);
      },
      onClose(e) {
        if (!abortController.signal.aborted) {
          const connectionError = e?.message ?? 'Connection closed';
          dispatch({ deleteSessionToken: true, connectionError });
        }
      }
    };

    async function connect() {
      dispatch({ deleteSessionToken: true });
      try {
        await props.transport.restoreChat(abortController.signal, listener, request);
      } catch (e) {
        if (!abortController.signal.aborted) {
          const connectionError = (e as Error)?.message ?? String(e);
          dispatch({ deleteSessionToken: true, connectionError });
        }
      }
    }

    connect();
    return () => abortController.abort();
  }, [request, reconnectKey, props.transport]);

  async function onSendMessage() {
    if (state.sessionToken && message.length > 0) {
      const abortSignal = AbortSignal.timeout(3_000);
      await props.transport.sendChatMessage(abortSignal, {
        sessionToken: state.sessionToken,
        message
      });
      setMessage('');
    }
  }

  async function onStopClicked() {
    if (state.sessionToken && state.isWorking) {
      const abortSignal = AbortSignal.timeout(3_000);
      await props.transport.interruptChat(abortSignal, {
        sessionToken: state.sessionToken
      });
    }
  }

  async function onStartNewConversation() {
    if (state.sessionToken) {
      const abortSignal = AbortSignal.timeout(3_000);
      await props.transport.restartChat(abortSignal, {
        sessionToken: state.sessionToken
      });
    }
  }

  function onReconnectClicked() {
    dispatch({ deleteSessionToken: true, connectionError: null });
    setReconnectKey(k => k + 1);
  }

  return (
    <ChatView
      assistantName={props.assistantName ?? 'Assistant'}
      userName={props.userName ?? 'User'}
      isWorking={state.isWorking}
      sessionToken={state.sessionToken}
      connectionError={state.connectionError}
      messages={state.messages}
      message={message}
      contextUsage={state.contextUsage}
      messageRenderer={props.messageRenderer}
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
  if (update.type === ChatMessageType.ASSISTANT && update.completedMessages) {
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
