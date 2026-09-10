import { DatabaseSync } from 'node:sqlite';
import { GetMyNotificationsResponse, MyNotificationDto } from '@ailaflow/shared';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { MyNotificationListQuerier } from './my-notification-list-querier';

export class SqliteMyNotificationListQuerier implements MyNotificationListQuerier {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async query(_: AbortSignal, userName: string, page: number, pageSize: number): Promise<GetMyNotificationsResponse> {
    const countStatement = this.db.prepare(`
      SELECT COUNT(*) AS totalCount
      FROM notifications
      WHERE userName = ?
    `);
    const { totalCount } = countStatement.get(userName) as { totalCount: number };

    const statement = this.db.prepare(`
      SELECT id, message, createdAt
      FROM notifications
      WHERE userName = ?
      ORDER BY createdAt DESC, id DESC
      LIMIT ? OFFSET ?
    `);
    const rows = statement.all(userName, pageSize, (page - 1) * pageSize) as MyNotificationDto[];
    const notifications = rows.map(row => ({
      id: row.id,
      message: row.message,
      createdAt: row.createdAt
    }));

    return { notifications, totalCount, page, pageSize };
  }
}
