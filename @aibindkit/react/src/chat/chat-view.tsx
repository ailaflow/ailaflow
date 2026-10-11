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
import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { ChatComposerView } from './chat-composer-view';
import { Markdown } from './markdown';
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
  emptyTitle?: string;
  emptyText?: string;
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
          <EmptyChatView emptyTitle={props.emptyTitle} emptyText={props.emptyText} />
        ) : (
          <ChatMessagesView
            assistantName={props.assistantName}
            userName={props.userName}
            messages={props.messages}
            sessionToken={props.sessionToken}
            messageRenderer={props.messageRenderer}
            messageFilter={props.messageFilter}
          />
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

function EmptyChatView(props: { emptyTitle?: string; emptyText?: string }) {
  return (
    <ChatStatusView
      title={props.emptyTitle ?? 'Start a conversation'}
      text={props.emptyText ?? 'Type a message below and the assistant will respond here.'}
    />
  );
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

function ChatMessagesView(props: {
  messages: ChatMessageUpdate[];
  sessionToken: string | null;
  assistantName: string;
  userName: string;
  messageRenderer?: ChatMessageRenderer;
  messageFilter: ChatMessageFilter;
}) {
  const items: ReactNode[] = [];
  let isAiHeaderPending = true;

  for (const update of props.messages) {
    const isAiUpdate = update.type === ChatMessageType.ASSISTANT || update.type === ChatMessageType.TOOL;
    if (!isAiUpdate) {
      isAiHeaderPending = true;
    }

    if (update.failReason || update.isInterrupted) {
      items.push(
        <li key={`${update.id}:failure`} className="abk-chat-failure">
          {update.failReason ? `Failed: ${update.failReason}` : 'Interrupted'}
        </li>
      );
      isAiHeaderPending = true;
      continue;
    }
    if (update.type === ChatMessageType.COMPACT) {
      items.push(
        <li key={`${update.id}:compact`} role="status" data-id={update.id} className="abk-chat-notification">
          Context compacted
        </li>
      );
      continue;
    }
    if (!update.type || !update.completedMessages) {
      continue;
    }

    for (const [messageIndex, message] of update.completedMessages.entries()) {
      const key = `${update.id}:${messageIndex}`;
      const messageItems = props.messageFilter(update.type, message.metadata) ? renderMessageItems(message, key, props.userName) : [];
      const customNode = props.sessionToken && props.messageRenderer?.(update.id, update.type, message, messageIndex, props.sessionToken);

      if (isAiUpdate && isAiHeaderPending && (messageItems.length > 0 || customNode)) {
        items.push(<AiHeaderView key={`${key}:ai-header`} assistantName={props.assistantName} />);
        isAiHeaderPending = false;
      }

      items.push(...messageItems);
      if (customNode) {
        items.push(<CustomMessageView key={`${key}:custom`}>{customNode}</CustomMessageView>);
      }
    }
  }

  return items;
}

function UserMessageView(props: { message: CompletedChatMessage; userName: string }) {
  return (
    <li className="abk-chat-item abk-chat-row abk-chat-row-user">
      <article className="abk-chat-bubble abk-chat-bubble-user">
        <div className="abk-chat-label">{props.userName}</div>
        <MessageContentView content={LlmMessageContentExtractor.tryExtract(props.message.message)} />
      </article>
    </li>
  );
}

function AiHeaderView(props: { assistantName: string }) {
  return <li className="abk-chat-item abk-chat-ai-header">{props.assistantName}</li>;
}

function AiReasoningView(props: { reasoning: string }) {
  return (
    <li className="abk-chat-item abk-chat-ai-item">
      <ReasoningView reasoning={props.reasoning} />
    </li>
  );
}

function AiResponseView(props: { children: string }) {
  return (
    <li className="abk-chat-item abk-chat-ai-item">
      <article className="abk-chat-ai-response">
        <Markdown>{props.children}</Markdown>
      </article>
    </li>
  );
}

function AiToolCallView(props: { toolCall: ToolCall }) {
  return (
    <li className="abk-chat-item abk-chat-ai-item">
      <ExpanderView
        label={
          <>
            Tool:{' '}
            <span className="abk-chat-summary-strong" title={props.toolCall.function.name}>
              {props.toolCall.function.name}
            </span>
          </>
        }
      >
        <pre className="abk-chat-details-content abk-chat-pre">{formatToolArguments(props.toolCall.function.arguments)}</pre>
      </ExpanderView>
    </li>
  );
}

function SystemMessageView(props: { message: CompletedChatMessage }) {
  return (
    <li className="abk-chat-item abk-chat-row abk-chat-row-system">
      <article className="abk-chat-bubble abk-chat-bubble-system">
        <div className="abk-chat-label">{props.message.message.role}</div>
        <MessageContentView content={LlmMessageContentExtractor.tryExtract(props.message.message)} />
      </article>
    </li>
  );
}

function AiToolResponseView(props: { message: CompletedChatMessage }) {
  const content = LlmMessageContentExtractor.tryExtract(props.message.message)?.content ?? null;
  const parsedContent = parseMaybeJson(content);
  const label = getToolResponseLabel(parsedContent);
  const isError = hasRootError(parsedContent);

  return (
    <li className="abk-chat-item abk-chat-ai-item">
      <ExpanderView
        isError={isError}
        label={
          <>
            Tool response
            {label && (
              <>
                : <span className="abk-chat-summary-strong">{label}</span>
              </>
            )}
          </>
        }
      >
        <pre className="abk-chat-details-content abk-chat-pre">{formatMaybeJson(content, parsedContent)}</pre>
      </ExpanderView>
    </li>
  );
}

function CustomMessageView(props: { children: ReactNode }) {
  return <li className="abk-chat-item">{props.children}</li>;
}

function renderMessageItems(message: CompletedChatMessage, key: string, userName: string): ReactNode[] {
  if (message.message.role === 'user') {
    return [<UserMessageView key={`${key}:user`} message={message} userName={userName} />];
  }
  if (message.message.role === 'tool') {
    return [<AiToolResponseView key={`${key}:tool-response`} message={message} />];
  }
  if (message.message.role !== 'assistant') {
    return [<SystemMessageView key={`${key}:system`} message={message} />];
  }

  const items: ReactNode[] = [];
  const content = LlmMessageContentExtractor.tryExtract(message.message);
  if (content?.reasoning) {
    items.push(<AiReasoningView key={`${key}:reasoning`} reasoning={content.reasoning} />);
  }
  if (content?.content) {
    items.push(<AiResponseView key={`${key}:response`}>{content.content}</AiResponseView>);
  }
  for (const toolCall of message.message.tool_calls ?? []) {
    if (toolCall.type === 'function') {
      items.push(<AiToolCallView key={`${key}:tool-call:${toolCall.id}`} toolCall={toolCall} />);
    }
  }
  return items;
}

function MessageContentView(props: { content: LlmMessageContent | null }) {
  if (!props.content) {
    return null;
  }

  return (
    <>
      {props.content.reasoning && <ReasoningView reasoning={props.content.reasoning} />}
      {props.content.content && <Markdown>{props.content.content}</Markdown>}
    </>
  );
}

function ReasoningView(props: { reasoning: string }) {
  return (
    <ExpanderView label="Reasoning">
      <div className="abk-chat-details-content abk-chat-reasoning-content">{props.reasoning}</div>
    </ExpanderView>
  );
}

function ExpanderView(props: { label: ReactNode; children: ReactNode; isError?: boolean }) {
  return (
    <details className={`abk-chat-details${props.isError ? ' abk-chat-details-error' : ''}`}>
      <summary className="abk-chat-summary">
        <SvgIcon name="detailsClosed" className="abk-chat-toggle abk-chat-toggle-closed" />
        <SvgIcon name="detailsOpen" className="abk-chat-toggle abk-chat-toggle-open" />
        <span className="abk-chat-summary-text">{props.label}</span>
      </summary>
      {props.children}
    </details>
  );
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
