import { SandboxLiteDto } from '@ailaflow/shared';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SandboxListQuerier } from './sandbox-list-querier';

export class SqliteSandboxListQuerier implements SandboxListQuerier {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async query(_: AbortSignal): Promise<SandboxLiteDto[]> {
    return this.db.read(db => {
      const statement = db.prepare(`
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
    });
  }
}
