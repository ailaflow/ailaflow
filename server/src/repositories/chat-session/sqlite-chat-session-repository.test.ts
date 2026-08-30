import { ChatMessageType } from '@aibindkit/core';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import test from 'node:test';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteChatSessionRepository } from './sqlite-chat-session-repository';

test('upserts and restores chat-session snapshots', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const repository = new SqliteChatSessionRepository({ dataDb: db } as SqliteDatabases);
  const abortSignal = new AbortController().signal;
  await repository.setup(abortSignal);

  assert.equal(await repository.tryGet(abortSignal, 'missing'), null);

  await repository.upsert(abortSignal, 'session', {
    totalTokens: 12,
    messages: [
      {
        id: 1,
        type: ChatMessageType.USER,
        completedMessages: [{ message: { role: 'user', content: 'Hello' } }]
      }
    ]
  });
  await repository.upsert(abortSignal, 'session', {
    totalTokens: 24,
    messages: [
      {
        id: 1,
        type: ChatMessageType.USER,
        completedMessages: [{ message: { role: 'user', content: 'Hello again' } }]
      }
    ]
  });

  assert.deepEqual(await repository.tryGet(abortSignal, 'session'), {
    totalTokens: 24,
    messages: [
      {
        id: 1,
        type: ChatMessageType.USER,
        completedMessages: [{ message: { role: 'user', content: 'Hello again' } }]
      }
    ]
  });
  db.close();
});
