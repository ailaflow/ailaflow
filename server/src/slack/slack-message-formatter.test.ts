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
    [
      {
        text: 'Hello from the portal',
        blocks: [
          { type: 'context', elements: [{ type: 'plain_text', text: '🌐 Sent from AilaFlow', emoji: true }] },
          { type: 'markdown', text: 'Hello from the portal' }
        ]
      }
    ]
  );
  assert.deepEqual(
    formatter.format({
      id: 2,
      type: ChatMessageType.ASSISTANT,
      completedMessages: [{ message: { role: 'assistant', content: 'Hello from Aila' } }]
    }),
    [{ text: 'Hello from Aila', blocks: [{ type: 'markdown', text: 'Hello from Aila' }] }]
  );
});

test('splits semantically without separating Unicode surrogate pairs', () => {
  const chunks = new SlackMessageFormatter().format({
    id: 1,
    type: ChatMessageType.ASSISTANT,
    completedMessages: [{ message: { role: 'assistant', content: `${'a'.repeat(11_899)}😀 b` } }]
  });
  const firstMarkdown = chunks[0].blocks?.[0];
  const secondMarkdown = chunks[1].blocks?.[0];
  assert.equal(firstMarkdown?.type, 'markdown');
  assert.equal(secondMarkdown?.type, 'markdown');
  assert.equal(Array.from(firstMarkdown?.type === 'markdown' ? firstMarkdown.text : '').length, 11_900);
  assert.equal(firstMarkdown?.type === 'markdown' && firstMarkdown.text.endsWith('😀'), true);
  assert.equal(secondMarkdown?.type === 'markdown' ? secondMarkdown.text : null, ' b');
});

test('closes and reopens fenced code blocks across payloads', () => {
  const chunks = new SlackMessageFormatter().format({
    id: 1,
    type: ChatMessageType.ASSISTANT,
    completedMessages: [{ message: { role: 'assistant', content: `\`\`\`typescript\n${'const value = 1;\n'.repeat(900)}\`\`\`` } }]
  });

  assert.equal(chunks.length > 1, true);
  const first = chunks[0].blocks?.[0];
  const second = chunks[1].blocks?.[0];
  assert.equal(first?.type === 'markdown' && first.text.endsWith('\n```'), true);
  assert.equal(second?.type === 'markdown' && second.text.startsWith('```typescript\n'), true);
  assert.equal(second?.type === 'markdown' && second.text.endsWith('```'), true);
});

test('formats failures and interruptions before considering the message type or content', () => {
  const formatter = new SlackMessageFormatter();

  assert.deepEqual(
    formatter.format({
      id: 1,
      type: ChatMessageType.TOOL,
      failReason: 'Tool call validation failed',
      completedMessages: [{ message: { role: 'tool', tool_call_id: 'call-1', content: 'Ignored' } }]
    }),
    [
      {
        text: '⚠️ Request failed\n\nTool call validation failed',
        blocks: [{ type: 'markdown', text: '⚠️ **Request failed**\n\nTool call validation failed' }]
      }
    ]
  );
  assert.deepEqual(
    formatter.format({
      id: 2,
      type: ChatMessageType.ASSISTANT,
      isInterrupted: true,
      completedMessages: [{ message: { role: 'user', content: 'Ignored' } }]
    }),
    [
      {
        text: '⏹️ Request interrupted.',
        blocks: [{ type: 'context', elements: [{ type: 'plain_text', text: '⏹️ Request interrupted.', emoji: true }] }]
      }
    ]
  );
  assert.deepEqual(
    formatter.format({
      id: 3,
      type: ChatMessageType.SYSTEM,
      failReason: ''
    }),
    [
      {
        text: '⚠️ Request failed\n\nUnknown error',
        blocks: [{ type: 'markdown', text: '⚠️ **Request failed**\n\nUnknown error' }]
      }
    ]
  );
});

test('reports successful compaction only when it did not fail or get interrupted', () => {
  const formatter = new SlackMessageFormatter();

  assert.deepEqual(
    formatter.format({
      id: 1,
      type: ChatMessageType.COMPACT,
      completedMessages: [{ message: { role: 'user', content: 'Compacted state' } }]
    }),
    [
      {
        text: '🧹 Conversation context compacted.',
        blocks: [
          {
            type: 'context',
            elements: [{ type: 'plain_text', text: '🧹 Conversation context compacted.', emoji: true }]
          }
        ]
      }
    ]
  );
  assert.deepEqual(
    formatter.format({
      id: 2,
      type: ChatMessageType.COMPACT,
      failReason: 'Compaction failed',
      completedMessages: [{ message: { role: 'user', content: 'Ignored' } }]
    }),
    [
      {
        text: '⚠️ Request failed\n\nCompaction failed',
        blocks: [{ type: 'markdown', text: '⚠️ **Request failed**\n\nCompaction failed' }]
      }
    ]
  );
  assert.deepEqual(
    formatter.format({
      id: 3,
      type: ChatMessageType.COMPACT,
      isInterrupted: true,
      completedMessages: [{ message: { role: 'user', content: 'Ignored' } }]
    }),
    [
      {
        text: '⏹️ Request interrupted.',
        blocks: [{ type: 'context', elements: [{ type: 'plain_text', text: '⏹️ Request interrupted.', emoji: true }] }]
      }
    ]
  );
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
    formatter.format({ id: 3, type: ChatMessageType.ASSISTANT, completedMessages: [{ message: { role: 'assistant', content: ' ' } }] }),
    []
  );
});
