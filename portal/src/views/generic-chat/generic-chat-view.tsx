import type { ToolCall } from '@aibindkit/model';
import { CompletedMessage, MessageChatUpdate } from '@aila/model';
import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';

export interface GenericChatViewProps {
  updates: MessageChatUpdate[];
  message: string;
  onMessageChanged: (message: string) => void;
  onSendMessage: () => void;
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
    <section className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
      <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {props.updates.map(update => (
          <GenericChatUpdateView key={update.id} update={update} />
        ))}
        <li ref={messagesEndRef} aria-hidden="true" />
      </ul>

      <div className="shrink-0 border-t border-slate-200 bg-slate-50 p-3">
        <div className="flex min-h-12 items-end gap-2 rounded-md border border-slate-200 bg-white p-2 shadow-sm focus-within:border-slate-400">
          <textarea
            value={props.message}
            onChange={e => props.onMessageChanged(e.currentTarget.value)}
            onKeyDown={onMessageKeyDown}
            rows={1}
            placeholder="Type a message..."
            className="max-h-36 min-h-8 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 py-1 text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="button"
            onClick={props.onSendMessage}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            Send
          </button>
        </div>
      </div>
    </section>
  );
}

function GenericChatUpdateView(props: { update: MessageChatUpdate }) {
  if (props.update.failReason) {
    return <li className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Failed: {props.update.failReason}</li>;
  }

  const messages = arr(props.update.completedMessage ?? []);

  return (
    <li data-id={props.update.id} className="space-y-2">
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
    <div className="flex justify-end">
      <article className="max-w-[82%] rounded-md bg-slate-900 px-3 py-2 text-sm text-white shadow-sm">
        <div className="mb-1 text-xs font-medium uppercase text-slate-300">User</div>
        <MessageContentView content={props.content} />
      </article>
    </div>
  );
}

function AssistantMessageView(props: { message: CompletedMessage }) {
  const toolCalls = getToolCalls(props.message);
  const content = getContent(props.message);

  return (
    <div className="flex justify-start">
      <article className="max-w-[88%] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm">
        <div className="mb-1 text-xs font-medium uppercase text-slate-500">Assistant</div>
        <MessageContentView content={content} />
        {toolCalls && <ToolCallsView toolCalls={toolCalls} />}
      </article>
    </div>
  );
}

function SystemMessageView(props: { message: CompletedMessage }) {
  return (
    <div className="flex justify-center">
      <article className="max-w-[88%] rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <div className="mb-1 font-medium uppercase text-slate-500">{props.message.role}</div>
        <MessageContentView content={getContent(props.message)} />
      </article>
    </div>
  );
}

function ToolMessageView(props: { message: CompletedMessage }) {
  const content = getContent(props.message);
  const label = getToolResponseLabel(content);

  return (
    <div className="flex justify-start">
      <details className="group max-w-[88%] rounded-md border border-slate-200 bg-slate-50 text-sm text-slate-900 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 marker:hidden">
          <span className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white text-[10px] text-slate-500 group-open:hidden">
            +
          </span>
          <span className="hidden h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white text-[10px] text-slate-500 group-open:flex">
            -
          </span>
          <span className="truncate">
            Tool response{label && <>: <span className="font-semibold text-slate-950">{label}</span></>}
          </span>
        </summary>
        <pre className="max-h-72 overflow-auto border-t border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-800">
          {formatMaybeJson(content)}
        </pre>
      </details>
    </div>
  );
}

function MessageContentView(props: { content: string | null }) {
  if (!props.content) {
    return null;
  }

  return <div className="whitespace-pre-wrap break-words leading-6">{props.content}</div>;
}

function ToolCallsView(props: { toolCalls: ToolCall[] }) {
  return (
    <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
      {props.toolCalls.map(call => (
        <details key={call.id} className="group rounded-md border border-slate-200 bg-slate-50">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 marker:hidden">
            <span className="flex h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white text-[10px] text-slate-500 group-open:hidden">
              +
            </span>
            <span className="hidden h-5 w-5 items-center justify-center rounded border border-slate-300 bg-white text-[10px] text-slate-500 group-open:flex">
              -
            </span>
            <span className="truncate">
              Function call: <span className="font-semibold text-slate-950">{call.function.name}</span>
            </span>
          </summary>
          <pre className="max-h-72 overflow-auto border-t border-slate-200 bg-white px-3 py-2 text-xs leading-5 text-slate-800">
            {formatToolArguments(call.function.arguments)}
          </pre>
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
