import { ProcessListQuerier } from './process-list-querier';
import {
  GetProcessesResponse,
  ProcessDisplay,
  ProcessExecutionMode,
  ProcessExecutionTraceRetention,
  ProcessLiteDto
} from '@ailaflow/shared';
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
      SELECT p.name, p.description, p.userAccessExpression, p.display, p.executionMode, p.traceRetention, p.icon, p.nTasksSteps,
        p.nReturnSteps, p.sandboxNames, p.definitionSize,
        EXISTS (
          SELECT 1
          FROM process_cron_jobs pcj
          WHERE pcj.processName = p.name
            AND pcj.isEnabled = 1
        ) AS hasEnabledCronJobs
      FROM processes p
      WHERE p.display <= ?
        AND instr(p.name, ?) > 0
      ORDER BY p.updatedAt DESC
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
  traceRetention: ProcessExecutionTraceRetention;
  icon: string | null;
  nTasksSteps: number;
  nReturnSteps: number;
  sandboxNames: string;
  definitionSize: number;
  hasEnabledCronJobs: number;
}

function mapRows(rows: ProcessRow[]): ProcessLiteDto[] {
  return rows.map(row => ({
    name: row.name,
    description: row.description,
    userAccessExpression: row.userAccessExpression,
    display: row.display,
    executionMode: row.executionMode,
    traceRetention: row.traceRetention,
    icon: row.icon,
    nTasksSteps: row.nTasksSteps,
    nReturnSteps: row.nReturnSteps,
    sandboxNames: JSON.parse(row.sandboxNames) as string[],
    definitionSize: row.definitionSize,
    hasEnabledCronJobs: Boolean(row.hasEnabledCronJobs)
  }));
}
