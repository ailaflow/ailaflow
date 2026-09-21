import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteUserRepository } from '../user/sqlite-user-repository';
import { User } from '../user/user';
import { Notification } from './notification';
import { SqliteNotificationRepository } from './sqlite-notification-repository';

test('inserts notifications for users', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  db.exec(`PRAGMA foreign_keys = ON`);
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const abortSignal = new AbortController().signal;
  const userRepository = new SqliteUserRepository(dbs);
  const notificationRepository = new SqliteNotificationRepository(dbs);

  await userRepository.setup(abortSignal);
  await notificationRepository.setup(abortSignal);
  await userRepository.insert(abortSignal, new User('alice', null, 'hash', true, false));
  await userRepository.insert(abortSignal, new User('bob', null, 'hash', true, false));

  await notificationRepository.insertMultiple(abortSignal, [
    new Notification('notification_1', 'process-1', 'alice', 'First', 1000),
    new Notification('notification_2', 'process-2', 'bob', 'Second', 2000)
  ]);
  await notificationRepository.insertMultiple(abortSignal, []);

  assert.equal(await notificationRepository.delete(abortSignal, 'alice', 'notification_2'), false);
  assert.equal(await notificationRepository.delete(abortSignal, 'alice', 'notification_1'), true);
  assert.equal(await notificationRepository.delete(abortSignal, 'alice', 'notification_1'), false);

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
