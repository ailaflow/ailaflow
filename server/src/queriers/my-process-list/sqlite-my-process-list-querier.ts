import { DatabaseSync } from 'node:sqlite';
import { MyProcessLiteDto } from '@aila/model';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteResourceAccessQueryBuilder } from '../../core/sqlite-resource-access-query-builder';
import { MyProcessListQuerier } from './my-process-list-querier';

export class SqliteMyProcessListQuerier implements MyProcessListQuerier {
  private readonly db: DatabaseSync;

  public constructor(
    dbs: SqliteDatabases,
    private readonly resourceAccessQueryBuilder = new SqliteResourceAccessQueryBuilder()
  ) {
    this.db = dbs.modelDb;
  }

  public async query(_: AbortSignal, userName: string): Promise<MyProcessLiteDto[]> {
    const statement = this.db.prepare(`
      WITH ${this.resourceAccessQueryBuilder.buildAccessibleResourcesCte()}
      SELECT p.name, p.description, p.startVariableSchemas
      FROM processes p
      JOIN accessible_resources ar
        ON ar.resource_id = 'process:' || p.name
      ORDER BY p.name
    `);
    const rows = statement.all(userName) as {
      name: string;
      description: string;
      startVariableSchemas: string;
    }[];

    return rows.map(row => ({
      name: row.name,
      description: row.description,
      startVariableSchemas: JSON.parse(row.startVariableSchemas)
    }));
  }
}
