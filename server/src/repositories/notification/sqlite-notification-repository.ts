import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { Notification } from './notification';
import { NotificationRepository } from './notification-repository';

export class SqliteNotificationRepository implements NotificationRepository {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        userName TEXT NOT NULL,
        message TEXT NOT NULL,
        createdAt INTEGER NOT NULL,

        FOREIGN KEY (userName)
          REFERENCES users(name)
          ON DELETE CASCADE,

        CHECK (createdAt >= 0)
      ) STRICT
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS notifications_user_created_at_idx
      ON notifications(userName, createdAt DESC, id DESC)
    `);
  }

  public async insertMultiple(_: AbortSignal, notifications: Notification[]): Promise<void> {
    if (notifications.length === 0) {
      return;
    }

    const statement = this.db.prepare(`
      INSERT INTO notifications (id, userName, message, createdAt)
      VALUES (?, ?, ?, ?)
    `);

    try {
      this.db.exec(`BEGIN`);
      for (const notification of notifications) {
        statement.run(notification.id, notification.userName, notification.message, notification.createdAt);
      }
      this.db.exec(`COMMIT`);
    } catch (e) {
      this.db.exec(`ROLLBACK`);
      throw e;
    }
  }

  public async delete(_: AbortSignal, userName: string, id: string): Promise<boolean> {
    const result = this.db.prepare(`DELETE FROM notifications WHERE userName = ? AND id = ?`).run(userName, id);
    return result.changes > 0;
  }
}
