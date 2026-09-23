import { GetMyTasksResponse, TaskSubmissionMode } from '@ailaflow/shared';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { MyTaskListQuerier } from './my-task-list-querier';

export class SqliteMyTaskListQuerier implements MyTaskListQuerier {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.dataDb;
  }

  public async query(
    _: AbortSignal,
    isTest: boolean,
    userName: string,
    onlyOpen: boolean,
    page: number,
    pageSize: number
  ): Promise<GetMyTasksResponse> {
    return this.db.read(db => {
      const statusCondition = onlyOpen ? 'AND at.completedAt IS NULL AND t.finalizedAt IS NULL' : '';
      const countStatement = db.prepare(`
      SELECT COUNT(*) AS totalCount
      FROM assigned_tasks at
      JOIN tasks t
        ON t.id = at.taskId
      WHERE t.isTest = ?
        AND at.userName = ?
        AND t.failedAt IS NULL
      ${statusCondition}
    `);
      const { totalCount } = countStatement.get(isTest ? 1 : 0, userName) as { totalCount: number };

      const statement = db.prepare(`
      SELECT
        t.id,
        t.title,
        t.submissionMode,
        t.deadline,
        t.createdAt,
        COALESCE(at.completedAt, t.finalizedAt) AS completedAt
      FROM assigned_tasks at
      JOIN tasks t
        ON t.id = at.taskId
      WHERE t.isTest = ?
        AND at.userName = ?
        AND t.failedAt IS NULL
      ${statusCondition}
      ORDER BY t.createdAt, t.id
      LIMIT ? OFFSET ?
    `);
      const rows = statement.all(isTest ? 1 : 0, userName, pageSize, (page - 1) * pageSize) as {
        id: string;
        title: string;
        submissionMode: TaskSubmissionMode;
        deadline: number | null;
        createdAt: number;
        completedAt: number | null;
      }[];

      return {
        tasks: rows.map(row => ({
          id: row.id,
          title: row.title,
          submissionMode: row.submissionMode,
          createdAt: row.createdAt,
          ...(row.completedAt === null ? {} : { completedAt: row.completedAt }),
          ...(row.deadline === null ? {} : { deadline: row.deadline })
        })),
        totalCount,
        page,
        pageSize
      };
    });
  }
}
