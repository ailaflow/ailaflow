import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { Notification } from './notification';
import { NotificationRepository } from './notification-repository';
import { Transaction } from '../../core/transaction';

export class SqliteNotificationRepository implements NotificationRepository {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.dataDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    await this.db.setup(1, 'notifications', (db, version) => {
      if (version < 1) {
        db.exec(`
          CREATE TABLE notifications (
            id TEXT PRIMARY KEY,
            userName TEXT NOT NULL,
            processName TEXT,
            message TEXT NOT NULL,
            createdAt INTEGER NOT NULL,

            CHECK (createdAt >= 0)
          ) STRICT
        `);
        db.exec(`
          CREATE INDEX notifications_user_created_at_idx
          ON notifications(userName, createdAt DESC, id DESC)
        `);
      }
    });
  }

  public async insertMultiple(_: AbortSignal, notifications: Notification[], transaction?: Transaction): Promise<void> {
    if (notifications.length === 0) {
      return;
    }

    await this.db.write(db => {
      const statement = db.prepare(`
        INSERT INTO notifications (id, userName, processName, message, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `);
      for (const notification of notifications) {
        statement.run(notification.id, notification.userName, notification.processName, notification.message, notification.createdAt);
      }
    }, transaction);
  }

  public async delete(_: AbortSignal, userName: string, id: string, transaction?: Transaction): Promise<boolean> {
    return this.db.write(
      db => db.prepare(`DELETE FROM notifications WHERE userName = ? AND id = ?`).run(userName, id).changes > 0,
      transaction
    );
  }

  public async deleteAll(_: AbortSignal, userName: string, transaction?: Transaction): Promise<number> {
    return this.db.write(db => Number(db.prepare(`DELETE FROM notifications WHERE userName = ?`).run(userName).changes), transaction);
  }
}
