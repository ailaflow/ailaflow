import { MessageType, type ToolCall } from '@aibindkit/core';
import type { CompletedMessage, MessageChatUpdate } from '@aibindkit/core';
import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';

export interface GenericChatViewProps {
  updates: MessageChatUpdate[];
  isWorking: boolean;
  message: string;
  onMessageChanged: (message: string) => void;
  onSendMessage: () => void;
  onStopClicked: () => void;
}

export function GenericChatView(props: GenericChatViewProps) {
  const messagesEndRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [props.updates]);

  function onMessageKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.ctrlKey) {
      return;
    }

    event.preventDefault();
    props.onSendMessage();
  }

  return (
    <section className="abk-chat">
      <ul className="abk-chat-messages">
        {props.updates.map(update => (
          <GenericChatUpdateView key={update.id} update={update} />
        ))}
        <li ref={messagesEndRef} aria-hidden="true" />
      </ul>

      <div className="abk-chat-composer">
        <div className="abk-chat-composer-inner">
          <textarea
            value={props.message}
            onChange={e => props.onMessageChanged(e.currentTarget.value)}
            onKeyDown={onMessageKeyDown}
            rows={1}
            placeholder="Type a message..."
            className="abk-chat-input"
          />
          {props.isWorking && (
            <button type="button" onClick={props.onStopClicked} className="abk-chat-send">
              Stop
            </button>
          )}
          <button type="button" onClick={props.onSendMessage} className="abk-chat-send">
            Send
          </button>
        </div>
      </div>
    </section>
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
          <span className="abk-chat-toggle abk-chat-toggle-closed">+</span>
          <span className="abk-chat-toggle abk-chat-toggle-open">-</span>
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
            <span className="abk-chat-toggle abk-chat-toggle-closed">+</span>
            <span className="abk-chat-toggle abk-chat-toggle-open">-</span>
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
