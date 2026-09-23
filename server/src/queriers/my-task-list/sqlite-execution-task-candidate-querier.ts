import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { ExecutionTaskCandidateQuerier } from './execution-task-candidate-querier';

export class SqliteExecutionTaskCandidateQuerier implements ExecutionTaskCandidateQuerier {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.dataDb;
  }

  public async query(
    _: AbortSignal,
    executionId: string,
    userName: string,
    isTest: boolean,
    now: number,
    limit: number
  ): Promise<string[]> {
    return this.db.read(db => {
      const statement = db.prepare(`
        SELECT t.id
        FROM tasks t
        INNER JOIN assigned_tasks at
          ON at.taskId = t.id
        WHERE t.executionId = ?
          AND at.userName = ?
          AND t.isTest = ?
          AND t.finalizedAt IS NULL
          AND t.failedAt IS NULL
          AND at.completedAt IS NULL
          AND (t.deadline IS NULL OR t.deadline >= ?)
        ORDER BY t.createdAt, t.id
        LIMIT ?
      `);
      const rows = statement.all(executionId, userName, isTest ? 1 : 0, now, limit) as unknown as { id: string }[];

      return rows.map(row => row.id);
    });
  }
}
