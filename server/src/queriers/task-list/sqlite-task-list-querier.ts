import { GetTasksResponse, TaskLiteDto } from '@ailaflow/shared';
import { DatabaseSync } from 'node:sqlite';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { TaskListQuerier } from './task-list-querier';

export class SqliteTaskListQuerier implements TaskListQuerier {
  private readonly db: DatabaseSync;

  public constructor(
    dbs: SqliteDatabases,
    private readonly now = Date.now
  ) {
    this.db = dbs.modelDb;
  }

  public async query(_: AbortSignal, onlyOpen: boolean, page: number, pageSize: number): Promise<GetTasksResponse> {
    const taskDetailsCte = this.createTaskDetailsCte();
    const completedCondition = onlyOpen ? `WHERE completedAt IS NULL` : '';
    const now = this.now();
    const { totalCount } = this.db
      .prepare(
        `
        ${taskDetailsCte}
        SELECT COUNT(*) AS totalCount
        FROM task_details
        ${completedCondition}
      `
      )
      .get() as { totalCount: number };

    const rows = this.db
      .prepare(
        `
        ${taskDetailsCte}
        SELECT id, title, createdBy, executionId, isTest, completedAt, deadline, assignedCount, completedCount, createdAt
        FROM task_details
        ${completedCondition}
        ORDER BY createdAt DESC, id DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(pageSize, (page - 1) * pageSize) as unknown as TaskRow[];

    return {
      tasks: rows.map(row => mapTask(row, now)),
      totalCount,
      page,
      pageSize
    };
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
          CASE WHEN COUNT(at.taskId) > 0 AND COUNT(at.completedAt) = COUNT(at.taskId)
            THEN MAX(at.completedAt)
          END AS completedAt,
          t.deadline,
          COUNT(at.taskId) AS assignedCount,
          COUNT(at.completedAt) AS completedCount,
          t.createdAt
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
  completedAt: number | null;
  deadline: number | null;
  assignedCount: number;
  completedCount: number;
  createdAt: number;
}

function mapTask(row: TaskRow, now: number): TaskLiteDto {
  return {
    id: row.id,
    title: row.title,
    createdBy: row.createdBy,
    executionId: row.executionId,
    isTest: row.isTest === 1,
    ...(row.completedAt === null ? {} : { completedAt: row.completedAt }),
    ...(row.completedAt === null && row.deadline !== null && now > row.deadline ? { isOutdated: true } : {}),
    assignedCount: row.assignedCount,
    completedCount: row.completedCount,
    createdAt: row.createdAt
  };
}
