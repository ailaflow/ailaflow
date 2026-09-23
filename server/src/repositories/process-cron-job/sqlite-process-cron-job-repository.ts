import { ProcessCronJobRun, ProcessExecutionVariableValues } from '@ailaflow/shared';
import { SqliteDatabase } from '../../core/sqlite-database';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { ProcessCronJob } from './process-cron-job';
import { ProcessCronJobRepository } from './process-cron-job-repository';
import { Transaction } from '../../core/transaction';

interface ProcessCronJobRow {
  id: string;
  processName: string;
  starterUserName: string;
  expression: string;
  timeZone: string;
  inputValues: string;
  isEnabled: number;
  nextExecutionAt: number;
  lastRun: string | null;
}

export class SqliteProcessCronJobRepository implements ProcessCronJobRepository {
  private readonly db: SqliteDatabase;

  public constructor(dbs: SqliteDatabases) {
    this.db = dbs.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    await this.db.setup(1, 'process_cron_jobs', (db, version) => {
      if (version < 1) {
        db.exec(`
          CREATE TABLE process_cron_jobs (
            id TEXT PRIMARY KEY,
            processName TEXT NOT NULL REFERENCES processes(name) ON DELETE CASCADE,
            starterUserName TEXT NOT NULL REFERENCES users(name) ON DELETE CASCADE,
            expression TEXT NOT NULL,
            timeZone TEXT NOT NULL,
            inputValues TEXT NOT NULL,
            isEnabled INTEGER NOT NULL CHECK (isEnabled IN (0, 1)),
            nextExecutionAt INTEGER NOT NULL,
            lastRun TEXT
          ) STRICT;

          CREATE INDEX process_cron_jobs_due
          ON process_cron_jobs (isEnabled, nextExecutionAt);
        `);
      }
    });
  }

  public async insert(_: AbortSignal, job: ProcessCronJob, transaction?: Transaction): Promise<void> {
    await this.db.write(db => {
      db.prepare(
        `
          INSERT INTO process_cron_jobs (
            id, processName, starterUserName, expression, timeZone, inputValues, isEnabled, nextExecutionAt, lastRun
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      ).run(...serialize(job));
    }, transaction);
  }

  public async updateConfiguration(_: AbortSignal, job: ProcessCronJob, transaction?: Transaction): Promise<void> {
    await this.db.write(db => {
      db.prepare(
        `
          UPDATE process_cron_jobs
          SET starterUserName = ?, expression = ?, timeZone = ?, inputValues = ?, isEnabled = ?, nextExecutionAt = ?
          WHERE id = ?
        `
      ).run(
        job.starterUserName,
        job.expression,
        job.timeZone,
        JSON.stringify(job.inputValues),
        job.isEnabled ? 1 : 0,
        job.nextExecutionAt,
        job.id
      );
    }, transaction);
  }

  public async updateLastRun(_: AbortSignal, id: string, lastRun: ProcessCronJobRun, transaction?: Transaction): Promise<boolean> {
    return this.db.write(
      db => db.prepare(`UPDATE process_cron_jobs SET lastRun = ? WHERE id = ?`).run(JSON.stringify(lastRun), id).changes > 0,
      transaction
    );
  }

  public async delete(_: AbortSignal, id: string, transaction?: Transaction): Promise<boolean> {
    return this.db.write(db => db.prepare(`DELETE FROM process_cron_jobs WHERE id = ?`).run(id).changes > 0, transaction);
  }

  public async tryGet(_: AbortSignal, id: string): Promise<ProcessCronJob | null> {
    return this.db.read(db => {
      const row = db
        .prepare(
          `
          SELECT id, processName, starterUserName, expression, timeZone, inputValues, isEnabled, nextExecutionAt, lastRun
          FROM process_cron_jobs
          WHERE id = ?
          LIMIT 1
        `
        )
        .get(id) as ProcessCronJobRow | undefined;
      return row ? deserialize(row) : null;
    });
  }

  public async getByProcessName(_: AbortSignal, processName: string): Promise<ProcessCronJob[]> {
    return this.db.read(db => {
      const rows = db
        .prepare(
          `
          SELECT id, processName, starterUserName, expression, timeZone, inputValues, isEnabled, nextExecutionAt, lastRun
          FROM process_cron_jobs
          WHERE processName = ?
          ORDER BY expression, id
        `
        )
        .all(processName) as unknown as ProcessCronJobRow[];
      return rows.map(deserialize);
    });
  }

  public async getDue(_: AbortSignal, now: number, limit: number): Promise<ProcessCronJob[]> {
    return this.db.read(db => {
      const rows = db
        .prepare(
          `
          SELECT id, processName, starterUserName, expression, timeZone, inputValues, isEnabled, nextExecutionAt, lastRun
          FROM process_cron_jobs
          WHERE isEnabled = 1 AND nextExecutionAt <= ?
          ORDER BY nextExecutionAt, id
          LIMIT ?
        `
        )
        .all(now, limit) as unknown as ProcessCronJobRow[];
      return rows.map(deserialize);
    });
  }

  public async tryAdvanceNextExecutionAt(
    _: AbortSignal,
    id: string,
    expectedNextExecutionAt: number,
    nextExecutionAt: number,
    transaction?: Transaction
  ): Promise<boolean> {
    return this.db.write(
      db =>
        db
          .prepare(
            `
            UPDATE process_cron_jobs
            SET nextExecutionAt = ?
            WHERE id = ? AND isEnabled = 1 AND nextExecutionAt = ?
          `
          )
          .run(nextExecutionAt, id, expectedNextExecutionAt).changes > 0,
      transaction
    );
  }
}

function serialize(job: ProcessCronJob): [string, string, string, string, string, string, number, number, string | null] {
  return [
    job.id,
    job.processName,
    job.starterUserName,
    job.expression,
    job.timeZone,
    JSON.stringify(job.inputValues),
    job.isEnabled ? 1 : 0,
    job.nextExecutionAt,
    job.lastRun === null ? null : JSON.stringify(job.lastRun)
  ];
}

function deserialize(row: ProcessCronJobRow): ProcessCronJob {
  return new ProcessCronJob(
    row.id,
    row.processName,
    row.starterUserName,
    row.expression,
    row.timeZone,
    JSON.parse(row.inputValues) as ProcessExecutionVariableValues,
    row.isEnabled === 1,
    row.nextExecutionAt,
    row.lastRun === null ? null : (JSON.parse(row.lastRun) as ProcessCronJobRun)
  );
}
