import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { TaskFinalizationCandidate, TaskFinalizationCandidateQuerier } from './task-finalization-candidate-querier';

export class SqliteTaskFinalizationCandidateQuerier implements TaskFinalizationCandidateQuerier {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async query(_: AbortSignal, now: number, limit: number): Promise<TaskFinalizationCandidate[]> {
    return this.db.read(db => {
      const statement = db.prepare(`
        SELECT id, deadline, finalizationRequestCount
        FROM tasks
        WHERE finalizedAt IS NULL
          AND (nextFinalizationAttemptAt IS NULL OR nextFinalizationAttemptAt <= ?)
          AND (
            finalizationRequestCount > 0
            OR (deadline IS NOT NULL AND deadline < ?)
          )
        ORDER BY createdAt, id
        LIMIT ?
      `);

      return statement.all(now, now, limit) as unknown as TaskFinalizationCandidate[];
    });
  }
}
