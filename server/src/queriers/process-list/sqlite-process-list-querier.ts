import { ProcessListQuerier } from './process-list-querier';
import { GetProcessesResponse, ProcessDisplay, ProcessExecutionMode, ProcessLiteDto } from '@ailaflow/shared';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';

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
      SELECT name, description, userAccessExpression, display, executionMode, isPausable, nReturnSteps, definitionSize
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
  display: ProcessDisplay;
  executionMode: ProcessExecutionMode;
  isPausable: number;
  nReturnSteps: number;
  definitionSize: number;
}

function mapRows(rows: ProcessRow[]): ProcessLiteDto[] {
  return rows.map(row => ({
    name: row.name,
    description: row.description,
    userAccessExpression: row.userAccessExpression,
    display: row.display,
    executionMode: row.executionMode,
    isPausable: row.isPausable === 1,
    nReturnSteps: row.nReturnSteps,
    definitionSize: row.definitionSize
  }));
}
