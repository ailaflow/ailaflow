import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { Notification } from './notification';
import { SqliteNotificationRepository } from './sqlite-notification-repository';

test('inserts notifications for users', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const dbs = { dataDb: new SqliteDatabase(db) } as SqliteDatabases;
  const signal = new AbortController().signal;
  const notificationRepository = new SqliteNotificationRepository(dbs);

  await notificationRepository.setup(signal);

  await notificationRepository.insertMultiple(signal, [
    new Notification('notification_1', 'alice', 'process-1', 'First', 1000),
    new Notification('notification_2', 'bob', null, 'Second', 2000),
    new Notification('notification_3', 'alice', 'process-3', 'Third', 3000)
  ]);
  await notificationRepository.insertMultiple(signal, []);

  assert.equal(await notificationRepository.delete(signal, 'alice', 'notification_2'), false);
  assert.equal(await notificationRepository.delete(signal, 'alice', 'notification_1'), true);
  assert.equal(await notificationRepository.delete(signal, 'alice', 'notification_1'), false);
  assert.equal(await notificationRepository.deleteAll(signal, 'alice'), 1);
  assert.equal(await notificationRepository.deleteAll(signal, 'alice'), 0);

  const rows = db
    .prepare(`SELECT id, userName, processName, message, createdAt FROM notifications ORDER BY id`)
    .all()
    .map(row => ({ ...row }));
  assert.deepEqual(rows, [{ id: 'notification_2', userName: 'bob', processName: null, message: 'Second', createdAt: 2000 }]);

  const indexes = db
    .prepare(
      `
      SELECT name
      FROM sqlite_master
      WHERE type = 'index'
        AND name = 'notifications_user_created_at_idx'
    `
    )
    .all()
    .map(row => ({ ...row }));
  assert.deepEqual(indexes, [{ name: 'notifications_user_created_at_idx' }]);

  db.close();
});
