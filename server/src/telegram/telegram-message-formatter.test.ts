import assert from 'node:assert/strict';
import { ChatMessageType } from '@aibindkit/core';
import test from 'node:test';
import { TelegramMessageFormatter } from './telegram-message-formatter';

test('formats user and assistant messages for Telegram', () => {
  const formatter = new TelegramMessageFormatter();

  assert.deepEqual(
    formatter.format({
      id: 1,
      type: ChatMessageType.USER,
      completedMessages: [{ message: { role: 'user', content: 'Hello' } }]
    }),
    ['You in Aila: Hello']
  );
  assert.deepEqual(
    formatter.format({
      id: 2,
      type: ChatMessageType.AI,
      completedMessages: [
        {
          message: {
            role: 'assistant',
            content: [
              { type: 'text', text: 'First' },
              { type: 'text', text: 'Second' }
            ]
          }
        }
      ]
    }),
    ['First\nSecond']
  );
});

test('splits formatted text at the Telegram message length limit', () => {
  const chunks = new TelegramMessageFormatter().format({
    id: 1,
    type: ChatMessageType.AI,
    completedMessages: [{ message: { role: 'assistant', content: 'a'.repeat(8_001) } }]
  });

  assert.deepEqual(
    chunks.map(chunk => chunk.length),
    [4_000, 4_000, 1]
  );
});

test('ignores internal, blank, mismatched, and unsupported messages', () => {
  const formatter = new TelegramMessageFormatter();

  assert.deepEqual(
    formatter.format({
      id: 1,
      type: ChatMessageType.USER,
      completedMessages: [{ message: { role: 'user', content: 'Internal' }, metadata: { internal: true } }]
    }),
    []
  );
  assert.deepEqual(
    formatter.format({
      id: 2,
      type: ChatMessageType.USER,
      completedMessages: [{ message: { role: 'assistant', content: 'Wrong role' } }]
    }),
    []
  );
  assert.deepEqual(
    formatter.format({
      id: 3,
      type: ChatMessageType.AI,
      completedMessages: [{ message: { role: 'assistant', content: '   ' } }]
    }),
    []
  );
  assert.deepEqual(
    formatter.format({
      id: 4,
      type: ChatMessageType.SYSTEM,
      completedMessages: [{ message: { role: 'system', content: 'System' } }]
    }),
    []
  );
});
