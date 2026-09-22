import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { Notification } from '../../repositories/notification/notification';
import { SqliteNotificationRepository } from '../../repositories/notification/sqlite-notification-repository';
import { SqliteUserRepository } from '../../repositories/user/sqlite-user-repository';
import { User } from '../../repositories/user/user';
import { SqliteMyNotificationListQuerier } from './sqlite-my-notification-list-querier';

test('queries a newest-first page of notifications for the current user', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const userRepository = new SqliteUserRepository(dbs);
  const notificationRepository = new SqliteNotificationRepository(dbs);
  const querier = new SqliteMyNotificationListQuerier(dbs);

  await userRepository.setup(signal);
  await notificationRepository.setup(signal);
  await userRepository.insert(signal, new User('alice', null, 'hash', true, false));
  await userRepository.insert(signal, new User('bob', null, 'hash', true, false));
  await notificationRepository.insertMultiple(signal, [
    new Notification('notification_1', 'process-1', 'alice', 'Oldest', 1000),
    new Notification('notification_2', 'process-1', 'alice', 'Middle', 2000),
    new Notification('notification_3', 'process-1', 'alice', 'Newest', 3000),
    new Notification('notification_4', 'process-2', 'bob', 'Other user', 4000)
  ]);

  assert.deepEqual(await querier.query(signal, 'alice', 1, 2), {
    notifications: [
      { id: 'notification_3', message: 'Newest', createdAt: 3000 },
      { id: 'notification_2', message: 'Middle', createdAt: 2000 }
    ],
    totalCount: 3,
    page: 1,
    pageSize: 2
  });
  assert.deepEqual(await querier.query(signal, 'alice', 2, 2), {
    notifications: [{ id: 'notification_1', message: 'Oldest', createdAt: 1000 }],
    totalCount: 3,
    page: 2,
    pageSize: 2
  });

  db.close();
});
