import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { IncompleteAssignedTaskCountQuerier } from './incomplete-assigned-task-count-querier';

export class SqliteIncompleteAssignedTaskCountQuerier implements IncompleteAssignedTaskCountQuerier {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async queryIncompleteAssignedTaskCount(_: AbortSignal, taskId: string): Promise<number> {
    const statement = this.db.prepare(`
      SELECT COUNT(*) AS incompleteAssignedTaskCount
      FROM assigned_tasks
      WHERE taskId = ?
        AND completedAt IS NULL
    `);
    const { incompleteAssignedTaskCount } = statement.get(taskId) as { incompleteAssignedTaskCount: number };

    return incompleteAssignedTaskCount;
  }
}
