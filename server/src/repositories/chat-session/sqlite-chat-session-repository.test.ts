import { ChatMessageType } from '@aibindkit/core';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import test from 'node:test';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { AsyncMutex } from '../../core/async-mutex';
import { Transaction } from '../../core/transaction';
import { SqliteChatSessionRepository } from './sqlite-chat-session-repository';

test('upserts and restores chat-session snapshots', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const repository = new SqliteChatSessionRepository({ dataDb: db, dataDbMutex: new AsyncMutex() } as SqliteDatabases);
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

test('serializes data writes behind an externally owned transaction', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const repository = new SqliteChatSessionRepository({ dataDb: db, dataDbMutex: new AsyncMutex() } as SqliteDatabases);
  const abortSignal = new AbortController().signal;
  await repository.setup(abortSignal);

  const transaction = Transaction.begin();
  await repository.upsert(abortSignal, 'rolled-back', { totalTokens: 0, messages: [] }, transaction);

  let standaloneWriteCompleted = false;
  const standaloneWrite = repository.upsert(abortSignal, 'committed', { totalTokens: 0, messages: [] }).then(() => {
    standaloneWriteCompleted = true;
  });
  await Promise.resolve();

  assert.equal(standaloneWriteCompleted, false);

  await transaction.rollback();
  await standaloneWrite;

  assert.equal(await repository.tryGet(abortSignal, 'rolled-back'), null);
  assert.notEqual(await repository.tryGet(abortSignal, 'committed'), null);
  db.close();
});
