import { DatabaseSync } from 'node:sqlite';
import { ContainerLiteDto } from '@aila/model';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { ContainerListQuerier } from './container-list-querier';

export class SqliteContainerListQuerier implements ContainerListQuerier {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async query(): Promise<ContainerLiteDto[]> {
    const statement = this.db.prepare(`
      SELECT name, isEnabled, description
      FROM containers
    `);
    const rows = statement.all() as {
      name: string;
      isEnabled: number;
      description: string;
    }[];
    return rows.map(row => ({
      name: row.name,
      isEnabled: row.isEnabled === 1,
      description: row.description
    }));
  }
}
