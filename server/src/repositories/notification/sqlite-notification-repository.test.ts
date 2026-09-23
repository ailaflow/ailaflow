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
    new Notification('notification_1', 'process-1', 'alice', 'First', 1000),
    new Notification('notification_2', 'process-2', 'bob', 'Second', 2000),
    new Notification('notification_3', 'process-3', 'alice', 'Third', 3000)
  ]);
  await notificationRepository.insertMultiple(signal, []);

  assert.equal(await notificationRepository.delete(signal, 'alice', 'notification_2'), false);
  assert.equal(await notificationRepository.delete(signal, 'alice', 'notification_1'), true);
  assert.equal(await notificationRepository.delete(signal, 'alice', 'notification_1'), false);
  assert.equal(await notificationRepository.deleteAll(signal, 'alice'), 1);
  assert.equal(await notificationRepository.deleteAll(signal, 'alice'), 0);

  const rows = db
    .prepare(`SELECT id, processName, userName, message, createdAt FROM notifications ORDER BY id`)
    .all()
    .map(row => ({ ...row }));
  assert.deepEqual(rows, [{ id: 'notification_2', processName: 'process-2', userName: 'bob', message: 'Second', createdAt: 2000 }]);

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
