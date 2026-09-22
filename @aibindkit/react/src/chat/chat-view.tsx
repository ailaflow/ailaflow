import {
  ChatMessageType,
  LlmMessageContentExtractor,
  type ChatContextUsageUpdate,
  type ChatMessageMetadata,
  type ChatMessageUpdate,
  type CompletedChatMessage,
  type LlmMessageContent,
  type ToolCall
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
  assistantName: string;
  userName: string;
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
  const chatRef = useRef<HTMLElement>(null);
  const messagesRef = useRef<HTMLUListElement>(null);

  useLayoutEffect(() => {
    const messages = messagesRef.current;
    if (messages) {
      messages.scrollTop = messages.scrollHeight;
    }
  }, [props.messages]);

  return (
    <section ref={chatRef} className="abk-chat">
      <ul ref={messagesRef} className="abk-chat-messages">
        {props.sessionToken === null && !props.connectionError ? (
          <LoadingChatView />
        ) : props.messages.length === 0 ? (
          <EmptyChatView />
        ) : (
          props.messages.map(update => (
            <ChatUpdateView
              key={update.id}
              assistantName={props.assistantName}
              userName={props.userName}
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
        chatRef={chatRef}
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
  assistantName: string;
  userName: string;
  messageRenderer?: ChatMessageRenderer;
  messageFilter: ChatMessageFilter;
}) {
  if (props.update.failReason) {
    return <li className="abk-chat-failure">Failed: {props.update.failReason}</li>;
  }
  if (props.update.isInterrupted) {
    return <li className="abk-chat-failure">Interrupted</li>;
  }
  if (props.update.type === ChatMessageType.COMPACT) {
    return (
      <li role="status" data-id={props.update.id} className="abk-chat-notification">
        Context compacted
      </li>
    );
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
                <ChatMessageView message={message} userName={props.userName} assistantName={props.assistantName} />
                {customNode}
              </Fragment>
            );
          }
          if (customNode) {
            return <Fragment key={index}>{customNode}</Fragment>;
          }
          if (isMessageVisible) {
            return <ChatMessageView key={index} message={message} userName={props.userName} assistantName={props.assistantName} />;
          }
          return null;
        })}
      </li>
    );
  }
  return null;
}

function ChatMessageView(props: { message: CompletedChatMessage; userName: string; assistantName: string }) {
  if (props.message.message.role === 'user') {
    return <UserMessageView message={props.message} userName={props.userName} />;
  }
  if (props.message.message.role === 'assistant') {
    return <AssistantMessageView message={props.message} assistantName={props.assistantName} />;
  }
  if (props.message.message.role === 'tool') {
    return <ToolMessageView message={props.message} />;
  }
  return <SystemMessageView message={props.message} />;
}

function UserMessageView(props: { message: CompletedChatMessage; userName: string }) {
  return (
    <div className="abk-chat-row abk-chat-row-user">
      <article className="abk-chat-bubble abk-chat-bubble-user">
        <div className="abk-chat-label">{props.userName}</div>
        <MessageContentView content={LlmMessageContentExtractor.tryExtract(props.message.message)} />
      </article>
    </div>
  );
}

function AssistantMessageView(props: { message: CompletedChatMessage; assistantName: string }) {
  const toolCalls = getToolCalls(props.message);
  const content = LlmMessageContentExtractor.tryExtract(props.message.message);

  return (
    <div className="abk-chat-row abk-chat-row-assistant">
      <article className="abk-chat-bubble abk-chat-bubble-assistant">
        <div className="abk-chat-label">{props.assistantName}</div>
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
        <MessageContentView content={LlmMessageContentExtractor.tryExtract(props.message.message)} />
      </article>
    </div>
  );
}

function ToolMessageView(props: { message: CompletedChatMessage }) {
  const content = LlmMessageContentExtractor.tryExtract(props.message.message)?.content ?? null;
  const parsedContent = parseMaybeJson(content);
  const label = getToolResponseLabel(parsedContent);
  const isError = hasRootError(parsedContent);

  return (
    <div className="abk-chat-row abk-chat-row-tool">
      <details className={`abk-chat-details${isError ? ' abk-chat-details-error' : ''}`}>
        <summary className="abk-chat-summary">
          <SvgIcon name="detailsClosed" className="abk-chat-toggle abk-chat-toggle-closed" />
          <SvgIcon name="detailsOpen" className="abk-chat-toggle abk-chat-toggle-open" />
          <span className="abk-chat-summary-text">
            Tool response
            {label && (
              <>
                : <span className="abk-chat-summary-strong">{label}</span>
              </>
            )}
          </span>
        </summary>
        <pre className="abk-chat-pre">{formatMaybeJson(content, parsedContent)}</pre>
      </details>
    </div>
  );
}

function MessageContentView(props: { content: LlmMessageContent | null }) {
  if (!props.content) {
    return null;
  }

  return (
    <>
      {props.content.reasoning && <ReasoningView reasoning={props.content.reasoning} />}
      {props.content.content && <div className="abk-chat-content">{props.content.content}</div>}
    </>
  );
}

function ReasoningView(props: { reasoning: string }) {
  return (
    <details className="abk-chat-reasoning">
      <summary className="abk-chat-reasoning-summary">
        <SvgIcon name="detailsClosed" className="abk-chat-toggle abk-chat-toggle-closed" />
        <SvgIcon name="detailsOpen" className="abk-chat-toggle abk-chat-toggle-open" />
        <span>Reasoning</span>
      </summary>
      <div className="abk-chat-reasoning-content">{props.reasoning}</div>
    </details>
  );
}

function ToolCallsView(props: { toolCalls: ToolCall[] }) {
  return (
    <div className="abk-chat-tool-calls">
      {props.toolCalls.map(call => (
        <details key={call.id} className="abk-chat-details abk-chat-tool-call">
          <summary className="abk-chat-summary">
            <SvgIcon name="detailsClosed" className="abk-chat-toggle abk-chat-toggle-closed" />
            <SvgIcon name="detailsOpen" className="abk-chat-toggle abk-chat-toggle-open" />
            <span className="abk-chat-summary-text">
              Tool:{' '}
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

function parseMaybeJson(content: string | null): unknown {
  if (!content) {
    return null;
  }

  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function formatMaybeJson(content: string | null, parsedContent = parseMaybeJson(content)) {
  if (parsedContent !== null) {
    return JSON.stringify(parsedContent, null, 2);
  }

  return content ?? '';
}

function getToolResponseLabel(parsedContent: unknown) {
  const value = getToolStatusField(parsedContent);
  if (value) {
    return limitText(value, 72);
  }

  return null;
}

function hasRootError(value: unknown) {
  return isRecord(value) && Object.prototype.hasOwnProperty.call(value, 'error');
}

function getToolStatusField(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  for (const key of ['error', 'success']) {
    const field = value[key];
    if (typeof field === 'string' && field.trim()) {
      return field;
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function limitText(value: string, maxLength: number) {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1)}...`;
}
