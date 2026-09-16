import assert from 'node:assert/strict';
import { ChatMessageType } from '@aibindkit/core';
import test from 'node:test';
import { SlackMessageFormatter } from './slack-message-formatter';

test('formats eligible messages as Slack-safe plain text', () => {
  const formatter = new SlackMessageFormatter();
  assert.deepEqual(
    formatter.format({
      id: 1,
      type: ChatMessageType.USER,
      completedMessages: [{ message: { role: 'user', content: 'Hello from the portal' } }]
    }),
    ['You in AilaFlow: Hello from the portal']
  );
  assert.deepEqual(
    formatter.format({
      id: 2,
      type: ChatMessageType.AI,
      completedMessages: [{ message: { role: 'assistant', content: 'Hello from Aila' } }]
    }),
    ['Hello from Aila']
  );
});

test('splits without separating Unicode surrogate pairs', () => {
  const chunks = new SlackMessageFormatter().format({
    id: 1,
    type: ChatMessageType.AI,
    completedMessages: [{ message: { role: 'assistant', content: `${'a'.repeat(3_999)}😀b` } }]
  });
  assert.equal(Array.from(chunks[0]).length, 4_000);
  assert.equal(chunks[0].endsWith('😀'), true);
  assert.equal(chunks[1], 'b');
});

test('ignores internal, blank, and mismatched Slack messages', () => {
  const formatter = new SlackMessageFormatter();
  assert.deepEqual(
    formatter.format({
      id: 1,
      type: ChatMessageType.USER,
      completedMessages: [{ message: { role: 'user', content: 'Secret' }, metadata: { internal: true } }]
    }),
    []
  );
  assert.deepEqual(
    formatter.format({ id: 2, type: ChatMessageType.USER, completedMessages: [{ message: { role: 'assistant', content: 'Wrong' } }] }),
    []
  );
  assert.deepEqual(
    formatter.format({ id: 3, type: ChatMessageType.AI, completedMessages: [{ message: { role: 'assistant', content: ' ' } }] }),
    []
  );
});
