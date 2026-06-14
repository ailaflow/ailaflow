import { DatabaseSync } from 'node:sqlite';
import { ProcessListQuerier } from './process-list-querier';
import { ProcessLiteDto } from '@aila/model';
import { SqliteDatabases } from '../../core/sqlite-databases';

export class SqliteProcessListQuerier implements ProcessListQuerier {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async query(): Promise<ProcessLiteDto[]> {
    const statement = this.db.prepare(`
      SELECT id, name, description, userList, nStartInputs
      FROM processes
    `);
    return statement.all() as ProcessLiteDto[];
  }
}
