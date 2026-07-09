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
        const toolCalls = getToolCalls(message);
        const content = getContent(message);
        return (
          <div key={index} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm">
            <div className="mb-1 text-xs font-medium uppercase text-slate-500">{message.role}</div>
            {toolCalls && (
              <div>
                {toolCalls.map(call => (
                  <div>
                    <strong>Call: {call.function.name}</strong>
                    <textarea>{call.function.arguments}</textarea>
                  </div>
                ))}
              </div>
            )}
            <div className="whitespace-pre-wrap break-words leading-6">{content}</div>
          </div>
        );
      })}
    </li>
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
