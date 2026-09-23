import { GetTasksResponse, TaskLiteDto } from '@ailaflow/shared';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { TaskListQuerier } from './task-list-querier';

export class SqliteTaskListQuerier implements TaskListQuerier {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.dataDb;
  }

  public async query(_: AbortSignal, onlyOpen: boolean, page: number, pageSize: number): Promise<GetTasksResponse> {
    return this.db.read(db => {
      const taskDetailsCte = this.createTaskDetailsCte();
      const openCondition = onlyOpen ? `WHERE finalizedAt IS NULL AND failedAt IS NULL` : '';
      const { totalCount } = db
        .prepare(
          `
        ${taskDetailsCte}
        SELECT COUNT(*) AS totalCount
        FROM task_details
        ${openCondition}
      `
        )
        .get() as { totalCount: number };

      const rows = db
        .prepare(
          `
        ${taskDetailsCte}
        SELECT id, title, createdBy, executionId, isTest, deadline, assignedCount, completedCount, createdAt, finalizedAt, failedAt
        FROM task_details
        ${openCondition}
        ORDER BY createdAt DESC, id DESC
        LIMIT ? OFFSET ?
      `
        )
        .all(pageSize, (page - 1) * pageSize) as unknown as TaskRow[];

      return {
        tasks: rows.map(mapTask),
        totalCount,
        page,
        pageSize
      };
    });
  }

  private createTaskDetailsCte(): string {
    return `
      WITH task_details AS (
        SELECT
          t.id,
          t.title,
          t.createdBy,
          t.executionId,
          t.isTest,
          t.deadline,
          COUNT(at.taskId) AS assignedCount,
          COUNT(at.completedAt) AS completedCount,
          t.createdAt,
          t.finalizedAt,
          t.failedAt
        FROM tasks t
        LEFT JOIN assigned_tasks at
          ON at.taskId = t.id
        GROUP BY t.id
      )
    `;
  }
}

interface TaskRow {
  id: string;
  title: string;
  createdBy: string;
  executionId: string;
  isTest: number;
  deadline: number | null;
  assignedCount: number;
  completedCount: number;
  createdAt: number;
  finalizedAt: number | null;
  failedAt: number | null;
}

function mapTask(row: TaskRow): TaskLiteDto {
  return {
    id: row.id,
    title: row.title,
    createdBy: row.createdBy,
    executionId: row.executionId,
    isTest: row.isTest === 1,
    deadline: row.deadline,
    assignedCount: row.assignedCount,
    completedCount: row.completedCount,
    createdAt: row.createdAt,
    finalizedAt: row.finalizedAt,
    failedAt: row.failedAt
  };
}
