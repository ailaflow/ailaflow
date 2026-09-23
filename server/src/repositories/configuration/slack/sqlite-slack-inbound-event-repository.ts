import { SqliteDatabase } from '../../../core/sqlite-database';
import { SqliteDatabases } from '../../../core/sqlite-databases';
import { SlackInboundEventRepository } from './slack-inbound-event-repository';
import { SlackInboundEvent, SlackInboundEventStatus } from './slack-types';

export class SqliteSlackInboundEventRepository implements SlackInboundEventRepository {
  private readonly db: SqliteDatabase;

  public constructor(databases: SqliteDatabases) {
    this.db = databases.modelDb;
  }

  public async setup(_: AbortSignal): Promise<void> {
    await this.db.setup(1, 'slack_inbound_events', (db, version) => {
      if (version < 1) {
        db.exec(`
          CREATE TABLE slack_inbound_events (
            eventId TEXT PRIMARY KEY,
            workspaceId TEXT NOT NULL,
            slackUserId TEXT NOT NULL,
            slackChannelId TEXT NOT NULL,
            slackMessageTs TEXT NOT NULL,
            text TEXT,
            eventPayload TEXT NOT NULL,
            status INTEGER NOT NULL,
            attemptCount INTEGER NOT NULL,
            nextAttemptAt INTEGER,
            lastError TEXT,
            receivedAt INTEGER NOT NULL,
            processedAt INTEGER
          ) STRICT
        `);
      }
    });
  }

  public async tryInsert(_: AbortSignal, event: SlackInboundEvent): Promise<boolean> {
    return this.db.write(db => {
      return (
        db
          .prepare(
            `
            INSERT OR IGNORE INTO slack_inbound_events (
              eventId, workspaceId, slackUserId, slackChannelId, slackMessageTs, text, eventPayload,
              status, attemptCount, nextAttemptAt, lastError, receivedAt, processedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `
          )
          .run(
            event.eventId,
            event.workspaceId,
            event.slackUserId,
            event.slackChannelId,
            event.slackMessageTs,
            event.text,
            event.eventPayload,
            event.status,
            event.attemptCount,
            event.nextAttemptAt,
            event.lastError,
            event.receivedAt,
            event.processedAt
          ).changes > 0
      );
    });
  }

  public async getPending(_: AbortSignal, now: number, limit: number): Promise<SlackInboundEvent[]> {
    return this.db.read(db => {
      return db
        .prepare(
          `
          SELECT * FROM slack_inbound_events
          WHERE status != ? AND (nextAttemptAt IS NULL OR nextAttemptAt <= ?)
          ORDER BY receivedAt LIMIT ?
        `
        )
        .all(SlackInboundEventStatus.PROCESSED, now, limit) as unknown as SlackInboundEvent[];
    });
  }

  public async markProcessed(_: AbortSignal, eventId: string, processedAt: number): Promise<void> {
    await this.db.write(db => {
      db.prepare(
        `
        UPDATE slack_inbound_events SET status = ?, processedAt = ?, nextAttemptAt = NULL, lastError = NULL WHERE eventId = ?
      `
      ).run(SlackInboundEventStatus.PROCESSED, processedAt, eventId);
    });
  }

  public async markFailed(_: AbortSignal, eventId: string, nextAttemptAt: number, error: string): Promise<void> {
    await this.db.write(db => {
      db.prepare(
        `
        UPDATE slack_inbound_events SET status = ?, attemptCount = attemptCount + 1, nextAttemptAt = ?, lastError = ? WHERE eventId = ?
      `
      ).run(SlackInboundEventStatus.FAILED, nextAttemptAt, error, eventId);
    });
  }

  public async deleteOldProcessed(_: AbortSignal, before: number): Promise<number> {
    return this.db.write(db =>
      Number(
        db.prepare(`DELETE FROM slack_inbound_events WHERE status = ? AND processedAt < ?`).run(SlackInboundEventStatus.PROCESSED, before)
          .changes
      )
    );
  }
}
