import { DatabaseSync } from 'node:sqlite';
import { ProcessListQuerier } from './process-list-querier';
import { GetProcessesResponse, ProcessLiteDto } from '@aila/model';
import { SqliteDatabases } from '../../core/sqlite-databases';

export class SqliteProcessListQuerier implements ProcessListQuerier {
  private readonly db: DatabaseSync;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async query(_: AbortSignal, page: number, pageSize: number): Promise<GetProcessesResponse> {
    const { totalCount } = this.db.prepare(`SELECT COUNT(*) AS totalCount FROM processes`).get() as { totalCount: number };
    const statement = this.db.prepare(`
      SELECT name, description, userAccessExpression, startVariableSchemas
      FROM processes
      ORDER BY name
      LIMIT ? OFFSET ?
    `);

    return {
      processes: mapRows(statement.all(pageSize, (page - 1) * pageSize) as unknown as ProcessRow[]),
      totalCount,
      page,
      pageSize
    };
  }
}

interface ProcessRow {
  name: string;
  description: string;
  userAccessExpression: string;
  startVariableSchemas: string;
}

function mapRows(rows: ProcessRow[]): ProcessLiteDto[] {
  return rows.map(row => ({
    name: row.name,
    description: row.description,
    userAccessExpression: row.userAccessExpression,
    startVariableSchemas: JSON.parse(row.startVariableSchemas)
  }));
}
