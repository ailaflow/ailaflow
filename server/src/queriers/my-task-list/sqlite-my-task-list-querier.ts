import { DatabaseSync } from 'node:sqlite';
import { GetMyTasksResponse } from '@aila/model';
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

  public async query(
    _: AbortSignal,
    isTest: boolean,
    userName: string,
    onlyOpen: boolean,
    page: number,
    pageSize: number
  ): Promise<GetMyTasksResponse> {
    const statusCondition = onlyOpen ? 'AND at.completedAt IS NULL' : '';
    const countStatement = this.db.prepare(`
      SELECT COUNT(*) AS totalCount
      FROM assigned_tasks at
      JOIN tasks t
        ON t.id = at.taskId
      WHERE t.isTest = ?
        AND at.userName = ?
      ${statusCondition}
    `);
    const { totalCount } = countStatement.get(isTest ? 1 : 0, userName) as { totalCount: number };

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
      WHERE t.isTest = ?
        AND at.userName = ?
      ${statusCondition}
      ORDER BY t.createdAt, t.id
      LIMIT ? OFFSET ?
    `);
    const rows = statement.all(isTest ? 1 : 0, userName, pageSize, (page - 1) * pageSize) as {
      id: string;
      title: string;
      deadline: number | null;
      createdAt: number;
      completedAt: number | null;
    }[];
    const now = this.now();

    return {
      tasks: rows.map(row => ({
        id: row.id,
        title: row.title,
        ...(row.completedAt === null ? {} : { completedAt: row.completedAt }),
        ...(row.completedAt === null && row.deadline !== null && now > row.deadline ? { isOutdated: true } : {})
      })),
      totalCount,
      page,
      pageSize
    };
  }
}
