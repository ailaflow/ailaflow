import { useEffect, useState } from 'react';
import { MessageChatUpdate, RestoreChatRequest, strMessageType, ToolCall } from '@aila/model';
import { useApiClient } from '../../auth/auth-context';

export interface ChatProps {
  request: RestoreChatRequest;
  onToolCalled?: (call: ToolCall) => Promise<string>;
}

export function Chat(props: ChatProps) {
  const apiClient = useApiClient();
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [updates, setUpdates] = useState<MessageChatUpdate[]>([]);
  const [newMessage, setNewMessage] = useState('');

  async function sendMessage() {
    if (!chatSessionId) {
      return;
    }
    if (newMessage.trim().length === 0) {
      return;
    }
    const abortSignal = AbortSignal.timeout(10000);
    await apiClient.chat.sendChatMessage(abortSignal, {
      chatSessionId,
      message: newMessage
    });
    setNewMessage('');
  }

  useEffect(() => {
    const abortControl = new AbortController();
    const u: MessageChatUpdate[] = [];
    apiClient.chat
      .restoreChat(
        abortControl.signal,
        {
          onMessage(update) {
            if (update.hello) {
              setChatSessionId(update.hello.chatSessionId);
            }
            if (update.messages) {
              u.push(...update.messages);
            } else if (update.currentMessage) {
              const id = update.currentMessage.id;
              const index = u.findIndex(m => m.id === id);
              let isNew = false;
              if (index >= 0) {
                u[index] = update.currentMessage;
                isNew = false;
              } else {
                u.push(update.currentMessage);
                isNew = true;
              }

              if (isNew && props.request.admin && props.onToolCalled && update.currentMessage.completedMessage) {
                for (const message of arr(update.currentMessage.completedMessage)) {
                  if (message.role === 'assistant' && message.tool_calls) {
                    for (const call of message.tool_calls) {
                      if (
                        call.type === 'function' &&
                        props.request.admin.frontendToolDescriptors.some(d => d.function.name === call.function.name)
                      ) {
                        props.onToolCalled(call).then(result => {
                          apiClient.chat.sendFrontendToolResult(abortControl.signal, {
                            callId: call.id,
                            result
                          });
                        });
                      }
                    }
                  }
                }
              }
            }
            setUpdates([...u]);
          },
          onClose(error) {
            if (error && error.name !== 'AbortError') {
              console.error(error);
            }
          }
        },
        props.request
      )
      .catch(console.error);

    return () => abortControl.abort();
  }, [apiClient, props.request]);

  return (
    <div>
      {props.request.admin && <h2>Admin Chat</h2>}
      {props.request.user && <h2>User Chat</h2>}
      <hr />
      {updates.map((message, index) => (
        <div key={`d_${index}`} style={{ border: '1px solid silver' }}>
          <div>
            {message.id} {strMessageType(message.type)}
          </div>
          <div>{message.failReason && <div>Fail: {message.failReason}</div>}</div>
          <div>
            {toMessages(message).map((m, i) => (
              <div key={`k_${i}`}>{m}</div>
            ))}
          </div>
        </div>
      ))}
      <hr />
      <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

function arr<T>(v: T | T[]): T[] {
  return Array.isArray(v) ? v : [v];
}

function toMessages(update: MessageChatUpdate) {
  if (update.completedMessage) {
    return arr(update.completedMessage)
      .map(m => (typeof m.content === 'string' ? m.content : m.content?.map(c => (c.type === 'text' ? c.text : ''))))
      .flat();
  }
  return [];
}
