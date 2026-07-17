import type { ToolCall, CompletedMessage, MessageChatUpdate } from '@aibindkit/core';
import { useLayoutEffect, useRef } from 'react';
import { GenericChatComposerView } from './generic-chat-composer-view';
import { SvgIcon } from './svg-icon';

export interface GenericChatViewProps {
  isLoading: boolean;
  isWorking: boolean;
  updates: MessageChatUpdate[];
  message: string;
  connectionError: string | null;
  onReconnectClicked: () => void;
  onMessageChanged: (message: string) => void;
  onSendMessage: () => void;
  onStopClicked: () => void;
  onStartNewConversation: () => void;
}

export function GenericChatView(props: GenericChatViewProps) {
  const messagesRef = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    const messages = messagesRef.current;
    if (messages) {
      messages.scrollTop = messages.scrollHeight;
    }
  }, [props.updates]);

  return (
    <section className="abk-chat">
      <ul ref={messagesRef} className="abk-chat-messages">
        {props.updates.length === 0 && (props.isLoading ? <LoadingChatView /> : <EmptyChatView />)}
        {props.updates.map(update => (
          <GenericChatUpdateView key={update.id} update={update} />
        ))}
      </ul>

      {props.connectionError && <ConnectionErrorBar error={props.connectionError} onReconnectClicked={props.onReconnectClicked} />}

      <GenericChatComposerView
        isWorking={props.isWorking}
        message={props.message}
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

function GenericChatUpdateView(props: { update: MessageChatUpdate }) {
  if (props.update.failReason) {
    return <li className="abk-chat-failure">Failed: {props.update.failReason}</li>;
  }
  if (props.update.isInterrupted) {
    return <li className="abk-chat-failure">Interrupted</li>;
  }

  const messages = arr(props.update.completedMessage ?? []);

  return (
    <li data-id={props.update.id} className="abk-chat-update">
      {messages.map((message, index) => {
        return <GenericChatMessageView key={index} message={message} />;
      })}
    </li>
  );
}

function GenericChatMessageView(props: { message: CompletedMessage }) {
  if (props.message.role === 'user') {
    return <UserMessageView content={getContent(props.message)} />;
  }
  if (props.message.role === 'assistant') {
    return <AssistantMessageView message={props.message} />;
  }
  if (props.message.role === 'tool') {
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

function AssistantMessageView(props: { message: CompletedMessage }) {
  const toolCalls = getToolCalls(props.message);
  const content = getContent(props.message);

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

function SystemMessageView(props: { message: CompletedMessage }) {
  return (
    <div className="abk-chat-row abk-chat-row-system">
      <article className="abk-chat-bubble abk-chat-bubble-system">
        <div className="abk-chat-label">{props.message.role}</div>
        <MessageContentView content={getContent(props.message)} />
      </article>
    </div>
  );
}

function ToolMessageView(props: { message: CompletedMessage }) {
  const content = getContent(props.message);
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

function arr<T>(i: T | T[]): T[] {
  return Array.isArray(i) ? i : [i];
}

function getToolCalls(message: CompletedMessage) {
  if (message.role === 'assistant' && message.tool_calls) {
    return message.tool_calls.filter(c => c.type === 'function');
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

function getContent(message: CompletedMessage): string | null {
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
