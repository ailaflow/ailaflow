import { DatabaseSync } from 'node:sqlite';
import { ProcessListQuerier } from './process-list-querier';
import { ProcessLiteDto } from '@aila/model';
import { SqliteDatabases } from '../../core/sqlite-databases';

export class SqliteProcessListQuerier implements ProcessListQuerier {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async query(_: AbortSignal): Promise<ProcessLiteDto[]> {
    const statement = this.db.prepare(`
      SELECT name, description, userAccessExpression, startVariableSchemas
      FROM processes
    `);
    const rows = statement.all() as {
      name: string;
      description: string;
      userAccessExpression: string;
      startVariableSchemas: string;
    }[];

    return rows.map(row => ({
      name: row.name,
      description: row.description,
      userAccessExpression: row.userAccessExpression,
      startVariableSchemas: JSON.parse(row.startVariableSchemas)
    }));
  }
}
