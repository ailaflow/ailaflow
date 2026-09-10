import { DatabaseSync } from 'node:sqlite';
import { SandboxLiteDto } from '@ailaflow/model';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SandboxListQuerier } from './sandbox-list-querier';

export class SqliteSandboxListQuerier implements SandboxListQuerier {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async query(_: AbortSignal): Promise<SandboxLiteDto[]> {
    const statement = this.db.prepare(`
      SELECT name, isEnabled, description
      FROM sandboxes
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
