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
    ['You in AilaFlow: Hello']
  );
  assert.deepEqual(
    formatter.format({
      id: 2,
      type: ChatMessageType.ASSISTANT,
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
    type: ChatMessageType.ASSISTANT,
    completedMessages: [{ message: { role: 'assistant', content: 'a'.repeat(8_001) } }]
  });

  assert.deepEqual(
    chunks.map(chunk => chunk.length),
    [4_000, 4_000, 1]
  );
});

test('formats failures and interruptions before considering the message type or content', () => {
  const formatter = new TelegramMessageFormatter();

  assert.deepEqual(
    formatter.format({
      id: 1,
      type: ChatMessageType.TOOL,
      failReason: 'Tool call validation failed',
      completedMessages: [{ message: { role: 'tool', tool_call_id: 'call-1', content: 'Ignored' } }]
    }),
    ['Failed: Tool call validation failed']
  );
  assert.deepEqual(
    formatter.format({
      id: 2,
      type: ChatMessageType.ASSISTANT,
      isInterrupted: true,
      completedMessages: [{ message: { role: 'user', content: 'Ignored' } }]
    }),
    ['Interrupted.']
  );
  assert.deepEqual(
    formatter.format({
      id: 3,
      type: ChatMessageType.SYSTEM,
      failReason: ''
    }),
    ['Failed: Unknown error']
  );
});

test('reports successful compaction only when it did not fail or get interrupted', () => {
  const formatter = new TelegramMessageFormatter();

  assert.deepEqual(
    formatter.format({
      id: 1,
      type: ChatMessageType.COMPACT,
      completedMessages: [{ message: { role: 'user', content: 'Compacted state' } }]
    }),
    ['Context compacted.']
  );
  assert.deepEqual(
    formatter.format({
      id: 2,
      type: ChatMessageType.COMPACT,
      failReason: 'Compaction failed',
      completedMessages: [{ message: { role: 'user', content: 'Ignored' } }]
    }),
    ['Failed: Compaction failed']
  );
  assert.deepEqual(
    formatter.format({
      id: 3,
      type: ChatMessageType.COMPACT,
      isInterrupted: true,
      completedMessages: [{ message: { role: 'user', content: 'Ignored' } }]
    }),
    ['Interrupted.']
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
      type: ChatMessageType.ASSISTANT,
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
