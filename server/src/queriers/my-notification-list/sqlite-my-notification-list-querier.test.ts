import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { Notification } from '../../repositories/notification/notification';
import { SqliteNotificationRepository } from '../../repositories/notification/sqlite-notification-repository';
import { SqliteMyNotificationListQuerier } from './sqlite-my-notification-list-querier';

test('queries a newest-first page of notifications for the current user', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { dataDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const notificationRepository = new SqliteNotificationRepository(dbs);
  const querier = new SqliteMyNotificationListQuerier(dbs);

  await notificationRepository.setup(signal);
  await notificationRepository.insertMultiple(signal, [
    new Notification('notification_1', 'alice', 'process-1', 'Oldest', 1000),
    new Notification('notification_2', 'alice', 'process-1', 'Middle', 2000),
    new Notification('notification_3', 'alice', 'process-1', 'Newest', 3000),
    new Notification('notification_4', 'bob', 'process-2', 'Other user', 4000)
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
