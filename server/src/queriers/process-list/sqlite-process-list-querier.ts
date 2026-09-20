import { ProcessListQuerier } from './process-list-querier';
import { GetProcessesResponse, ProcessDisplay, ProcessLiteDto } from '@ailaflow/shared';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';

export class SqliteProcessListQuerier implements ProcessListQuerier {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async query(
    _: AbortSignal,
    page: number,
    pageSize: number,
    displayAtLeast: ProcessDisplay,
    search?: string
  ): Promise<GetProcessesResponse> {
    return this.db.read(db => {
      const searchTerm = search ?? '';
      const { totalCount } = db
        .prepare(`SELECT COUNT(*) AS totalCount FROM processes WHERE display <= ? AND instr(name, ?) > 0`)
        .get(displayAtLeast, searchTerm) as { totalCount: number };
      const statement = db.prepare(`
      SELECT name, description, userAccessExpression, isPausable, startVariableSchemas
      FROM processes
      WHERE display <= ?
        AND instr(name, ?) > 0
      ORDER BY name
      LIMIT ? OFFSET ?
    `);

      return {
        processes: mapRows(statement.all(displayAtLeast, searchTerm, pageSize, (page - 1) * pageSize) as unknown as ProcessRow[]),
        totalCount,
        page,
        pageSize
      };
    });
  }
}

interface ProcessRow {
  name: string;
  description: string;
  userAccessExpression: string;
  isPausable: number;
  startVariableSchemas: string;
}

function mapRows(rows: ProcessRow[]): ProcessLiteDto[] {
  return rows.map(row => ({
    name: row.name,
    description: row.description,
    userAccessExpression: row.userAccessExpression,
    isPausable: row.isPausable === 1,
    startVariableSchemas: JSON.parse(row.startVariableSchemas)
  }));
}
