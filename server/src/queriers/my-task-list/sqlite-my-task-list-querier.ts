import { DatabaseSync } from 'node:sqlite';
import { MyTaskLiteDto } from '@aila/model';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { MyTaskListQuerier } from './my-task-list-querier';

export class SqliteMyTaskListQuerier implements MyTaskListQuerier {
  private readonly db: DatabaseSync;

  public constructor(
    dbs: SqliteDatabases,
    private readonly now = Date.now
  ) {
    this.db = dbs.modelDb;
  }

  public async query(_: AbortSignal, userName: string): Promise<MyTaskLiteDto[]> {
    const statement = this.db.prepare(`
      SELECT
        t.id,
        t.title,
        t.deadline,
        t.createdAt,
        at.completedAt
      FROM assigned_tasks at
      JOIN tasks t
        ON t.id = at.taskId
      WHERE at.userName = ?
      ORDER BY t.createdAt, t.id
    `);
    const rows = statement.all(userName) as {
      id: string;
      title: string;
      deadline: number | null;
      createdAt: number;
      completedAt: number | null;
    }[];
    const now = this.now();

    return rows.map(row => ({
      id: row.id,
      title: row.title,
      ...(row.completedAt === null ? {} : { completedAt: row.completedAt }),
      ...(row.completedAt === null && row.deadline !== null && now > row.deadline ? { isOutdated: true } : {})
    }));
  }
}
