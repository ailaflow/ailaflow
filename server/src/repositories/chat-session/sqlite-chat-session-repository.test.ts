import { ChatMessageType } from '@aibindkit/core';
import { DatabaseSync } from 'node:sqlite';
import assert from 'node:assert/strict';
import test from 'node:test';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { Transaction } from '../../core/transaction';
import { SqliteChatSessionRepository } from './sqlite-chat-session-repository';

test('upserts and restores chat-session snapshots', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const repository = new SqliteChatSessionRepository({ chatDb: new SqliteDatabase(db) } as SqliteDatabases);
  const signal = new AbortController().signal;
  await repository.setup(signal);

  assert.equal(await repository.tryGet(signal, 'missing'), null);

  await repository.upsert(signal, 'session', {
    totalTokens: 12,
    messages: [
      {
        id: 1,
        type: ChatMessageType.USER,
        completedMessages: [{ message: { role: 'user', content: 'Hello' } }]
      }
    ]
  });
  await repository.upsert(signal, 'session', {
    totalTokens: 24,
    messages: [
      {
        id: 1,
        type: ChatMessageType.USER,
        completedMessages: [{ message: { role: 'user', content: 'Hello again' } }]
      }
    ]
  });

  assert.deepEqual(await repository.tryGet(signal, 'session'), {
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
  const repository = new SqliteChatSessionRepository({ chatDb: new SqliteDatabase(db) } as SqliteDatabases);
  const signal = new AbortController().signal;
  await repository.setup(signal);

  const transaction = Transaction.begin();
  await repository.upsert(signal, 'rolled-back', { totalTokens: 0, messages: [] }, transaction);

  let standaloneWriteCompleted = false;
  const standaloneWrite = repository.upsert(signal, 'committed', { totalTokens: 0, messages: [] }).then(() => {
    standaloneWriteCompleted = true;
  });
  await Promise.resolve();

  assert.equal(standaloneWriteCompleted, false);

  await transaction.rollback();
  await standaloneWrite;

  assert.equal(await repository.tryGet(signal, 'rolled-back'), null);
  assert.notEqual(await repository.tryGet(signal, 'committed'), null);
  db.close();
});
