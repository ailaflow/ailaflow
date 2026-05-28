import { useEffect, useRef, useState } from 'react';
import { useApiClient } from '../../auth/api-client-context';
import { ChatMessageUpdate } from '@aila/model';

export function Chat(props: { chatName: string }) {
  const apiClient = useApiClient();
  const [updates, setUpdates] = useState<ChatMessageUpdate[]>([]);
  const [newMessage, setNewMessage] = useState('');

  async function sendMessage() {
    if (newMessage.trim().length === 0) {
      return;
    }
    const abortSignal = AbortSignal.timeout(10000);
    await apiClient.chat.sendChatMessage(abortSignal, {
      chatName: props.chatName,
      message: newMessage
    });
    setNewMessage('');
  }

  useEffect(() => {
    const abortControl = new AbortController();
    const u: ChatMessageUpdate[] = [];
    apiClient.chat
      .restoreChat(
        abortControl.signal,
        {
          chatName: props.chatName
        },
        {
          onMessage(update) {
            if (update.messages) {
              u.push(...update.messages);
            } else if (update.currentMessage) {
              const id = update.currentMessage.id;
              const index = u.findIndex(m => m.id === id);
              if (index >= 0) {
                u[index] = update.currentMessage;
              } else {
                u.push(update.currentMessage);
              }
            }
            setUpdates([...u]);
          },
          onClose(error) {
            if (error && error.name !== 'AbortError') {
              console.error(error);
            }
          }
        }
      )
      .catch(console.error);

    return () => abortControl.abort();
  }, [apiClient, props.chatName]);

  return (
    <div>
      {props.chatName}
      <hr />
      {updates.map((message, index) => (
        <div key={`d_${index}`} style={{ border: '1px solid silver' }}>
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

function toMessages(update: ChatMessageUpdate) {
  if (update.completedMessage) {
    const list = Array.isArray(update.completedMessage) ? update.completedMessage : [update.completedMessage];
    return list.map(m => (typeof m.content === 'string' ? m.content : m.content?.map(c => (c.type === 'text' ? c.text : '')))).flat();
  }
  return [];
}
