import type {
  ChatContextUsageUpdate,
  ChatMessageMetadata,
  ChatMessageType,
  ChatMessageUpdate,
  CompletedChatMessage,
  LlmMessage,
  ToolCall
} from '@aibindkit/core';
import { Fragment, useLayoutEffect, useRef } from 'react';
import { ChatComposerView } from './chat-composer-view';
import { SvgIcon } from './svg-icon';

export type ChatMessageFilter = (type: ChatMessageType, metadata?: ChatMessageMetadata) => boolean;
export type ChatMessageRenderer = (
  id: number,
  type: ChatMessageType,
  completedMessage: CompletedChatMessage,
  completedMessageIndex: number,
  sessionToken: string
) => React.ReactNode | null;

export interface ChatViewProps {
  sessionToken: string | null;
  isWorking: boolean;
  messages: ChatMessageUpdate[];
  message: string;
  contextUsage?: ChatContextUsageUpdate;
  connectionError: string | null;
  messageFilter: ChatMessageFilter;
  messageRenderer?: ChatMessageRenderer;
  onReconnectClicked: () => void;
  onMessageChanged: (message: string) => void;
  onSendMessage: () => void;
  onStopClicked: () => void;
  onStartNewConversation: () => void;
}

export function ChatView(props: ChatViewProps) {
  const messagesRef = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    const messages = messagesRef.current;
    if (messages) {
      messages.scrollTop = messages.scrollHeight;
    }
  }, [props.messages]);

  return (
    <section className="abk-chat">
      <ul ref={messagesRef} className="abk-chat-messages">
        {props.sessionToken === null && !props.connectionError ? (
          <LoadingChatView />
        ) : props.messages.length === 0 ? (
          <EmptyChatView />
        ) : (
          props.messages.map(update => (
            <ChatUpdateView
              key={update.id}
              update={update}
              sessionToken={props.sessionToken}
              messageRenderer={props.messageRenderer}
              messageFilter={props.messageFilter}
            />
          ))
        )}
      </ul>

      {props.connectionError && <ConnectionErrorBar error={props.connectionError} onReconnectClicked={props.onReconnectClicked} />}

      <ChatComposerView
        isWorking={props.isWorking}
        message={props.message}
        contextUsage={props.contextUsage}
        onMessageChanged={props.onMessageChanged}
        onSendMessage={props.onSendMessage}
        onStopClicked={props.onStopClicked}
        onStartNewConversation={props.onStartNewConversation}
      />
    </section>
  );
}

function ConnectionErrorBar(props: { error: string; onReconnectClicked: () => void }) {
  return (
    <div className="abk-chat-connection-bar">
      <div className="abk-chat-connection-text">
        <span className="abk-chat-connection-title">Disconnected</span>
        <span className="abk-chat-connection-message">{props.error}</span>
      </div>
      <button type="button" className="abk-chat-reconnect" onClick={props.onReconnectClicked}>
        Reconnect
      </button>
    </div>
  );
}

function EmptyChatView() {
  return <ChatStatusView title="Start a conversation" text="Type a message below and the assistant will respond here." />;
}

function LoadingChatView() {
  return <ChatStatusView title="Connecting..." text="Restoring the conversation." />;
}

function ChatStatusView(props: { title: string; text: string }) {
  return (
    <li className="abk-chat-status">
      <div className="abk-chat-status-title">{props.title}</div>
      <div className="abk-chat-status-text">{props.text}</div>
    </li>
  );
}

function ChatUpdateView(props: {
  update: ChatMessageUpdate;
  sessionToken: string | null;
  messageRenderer?: ChatMessageRenderer;
  messageFilter: ChatMessageFilter;
}) {
  if (props.update.failReason) {
    return <li className="abk-chat-failure">Failed: {props.update.failReason}</li>;
  }
  if (props.update.isInterrupted) {
    return <li className="abk-chat-failure">Interrupted</li>;
  }
  if (props.update.type && props.update.completedMessages) {
    const type = props.update.type;
    return (
      <li data-id={props.update.id} className="abk-chat-update">
        {props.update.completedMessages.map((message, index) => {
          const isMessageVisible = props.messageFilter(type, message.metadata);
          const customNode = props.sessionToken && props.messageRenderer?.(props.update.id, type, message, index, props.sessionToken);

          if (customNode && isMessageVisible) {
            return (
              <Fragment key={index}>
                <ChatMessageView message={message} />
                {customNode}
              </Fragment>
            );
          }
          if (customNode) {
            return <Fragment key={index}>{customNode}</Fragment>;
          }
          if (isMessageVisible) {
            return <ChatMessageView key={index} message={message} />;
          }
          return null;
        })}
      </li>
    );
  }
  return null;
}

function ChatMessageView(props: { message: CompletedChatMessage }) {
  if (props.message.message.role === 'user') {
    return <UserMessageView content={getContent(props.message.message)} />;
  }
  if (props.message.message.role === 'assistant') {
    return <AssistantMessageView message={props.message} />;
  }
  if (props.message.message.role === 'tool') {
    return <ToolMessageView message={props.message} />;
  }
  return <SystemMessageView message={props.message} />;
}

function UserMessageView(props: { content: string | null }) {
  return (
    <div className="abk-chat-row abk-chat-row-user">
      <article className="abk-chat-bubble abk-chat-bubble-user">
        <div className="abk-chat-label">User</div>
        <MessageContentView content={props.content} />
      </article>
    </div>
  );
}

function AssistantMessageView(props: { message: CompletedChatMessage }) {
  const toolCalls = getToolCalls(props.message);
  const content = getContent(props.message.message);

  return (
    <div className="abk-chat-row abk-chat-row-assistant">
      <article className="abk-chat-bubble abk-chat-bubble-assistant">
        <div className="abk-chat-label">Assistant</div>
        <MessageContentView content={content} />
        {toolCalls && <ToolCallsView toolCalls={toolCalls} />}
      </article>
    </div>
  );
}

function SystemMessageView(props: { message: CompletedChatMessage }) {
  return (
    <div className="abk-chat-row abk-chat-row-system">
      <article className="abk-chat-bubble abk-chat-bubble-system">
        <div className="abk-chat-label">{props.message.message.role}</div>
        <MessageContentView content={getContent(props.message.message)} />
      </article>
    </div>
  );
}

function ToolMessageView(props: { message: CompletedChatMessage }) {
  const content = getContent(props.message.message);
  const label = getToolResponseLabel(content);

  return (
    <div className="abk-chat-row abk-chat-row-tool">
      <details className="abk-chat-details">
        <summary className="abk-chat-summary">
          <span className="abk-chat-toggle abk-chat-toggle-closed">
            <SvgIcon name="detailsClosed" />
          </span>
          <span className="abk-chat-toggle abk-chat-toggle-open">
            <SvgIcon name="detailsOpen" />
          </span>
          <span className="abk-chat-summary-text">
            Tool response
            {label && (
              <>
                : <span className="abk-chat-summary-strong">{label}</span>
              </>
            )}
          </span>
        </summary>
        <pre className="abk-chat-pre">{formatMaybeJson(content)}</pre>
      </details>
    </div>
  );
}

function MessageContentView(props: { content: string | null }) {
  if (!props.content) {
    return null;
  }

  return <div className="abk-chat-content">{props.content}</div>;
}

function ToolCallsView(props: { toolCalls: ToolCall[] }) {
  return (
    <div className="abk-chat-tool-calls">
      {props.toolCalls.map(call => (
        <details key={call.id} className="abk-chat-details abk-chat-tool-call">
          <summary className="abk-chat-summary">
            <span className="abk-chat-toggle abk-chat-toggle-closed">
              <SvgIcon name="detailsClosed" />
            </span>
            <span className="abk-chat-toggle abk-chat-toggle-open">
              <SvgIcon name="detailsOpen" />
            </span>
            <span className="abk-chat-summary-text">
              Function:{' '}
              <span className="abk-chat-summary-strong" title={call.function.name}>
                {call.function.name}
              </span>
            </span>
          </summary>
          <pre className="abk-chat-pre">{formatToolArguments(call.function.arguments)}</pre>
        </details>
      ))}
    </div>
  );
}

function getToolCalls(message: CompletedChatMessage) {
  if (message.message.role === 'assistant' && message.message.tool_calls) {
    return message.message.tool_calls.filter(c => c.type === 'function');
  }
  return null;
}

function formatToolArguments(argumentsJson: string) {
  try {
    return JSON.stringify(JSON.parse(argumentsJson), null, 2);
  } catch {
    return argumentsJson;
  }
}

function formatMaybeJson(content: string | null) {
  if (!content) {
    return '';
  }

  try {
    return JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    return content;
  }
}

function getToolResponseLabel(content: string | null) {
  if (!content) {
    return null;
  }

  try {
    const parsed = JSON.parse(content);
    const value = getToolStatusField(parsed);
    if (value) {
      return limitText(value, 72);
    }
  } catch {
    return null;
  }

  return null;
}

function getToolStatusField(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const object = value as Record<string, unknown>;
  for (const key of ['error', 'success']) {
    const field = object[key];
    if (typeof field === 'string' && field.trim()) {
      return field;
    }
  }

  return null;
}

function limitText(value: string, maxLength: number) {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}...`;
}

function getContent(message: LlmMessage): string | null {
  if (typeof message.content === 'string') {
    return message.content;
  }
  if (message.role === 'assistant' && 'reasoning' in message && typeof message.reasoning === 'string') {
    return message.reasoning;
  }
  if (message.content?.[0].type === 'text') {
    return message.content[0].text;
  }
  return null;
}
