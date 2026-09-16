import { SlackWelcomeStatus } from '@ailaflow/shared';
import type { GetSlackUsersResponse, SlackUserDto } from '@ailaflow/shared';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SlackMappingWelcomeStatus } from '../../repositories/configuration/slack/slack-types';
import { SlackUserListQuerier } from './slack-user-list-querier';

interface SlackUserRow {
  slackUserId: string;
  legacyName: string | null;
  displayName: string | null;
  realName: string | null;
  email: string | null;
  isDeleted: number;
  userName: string | null;
  mappingGeneration: number | null;
  mappingUpdatedAt: number | null;
  welcomeStatus: SlackMappingWelcomeStatus | null;
  welcomeLastError: string | null;
}

export class SqliteSlackUserListQuerier implements SlackUserListQuerier {
  private readonly db: SqliteDatabase;

  public constructor(databases: SqliteDatabases) {
    this.db = databases.modelDb;
  }

  public async query(_: AbortSignal, workspaceId: string, page: number, pageSize: number, search?: string): Promise<GetSlackUsersResponse> {
    return this.db.read(db => {
      const configuration = db
        .prepare(`SELECT mappingRevision FROM slack_configuration WHERE id = 1 AND workspaceId = ?`)
        .get(workspaceId) as { mappingRevision: number } | undefined;
      if (!configuration) {
        throw new Error('Slack configuration is unavailable');
      }
      const searchTerm = search?.trim() ?? '';
      const searchParameters = [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm];
      const where = `
        su.workspaceId = ?
        AND su.isBot = 0
        AND su.isAppUser = 0
        AND (
          instr(su.slackUserId, ?) > 0
          OR instr(COALESCE(su.legacyName, ''), ?) > 0
          OR instr(COALESCE(su.displayName, ''), ?) > 0
          OR instr(COALESCE(su.realName, ''), ?) > 0
          OR instr(COALESCE(su.email, ''), ?) > 0
        )
      `;
      const { totalCount } = db
        .prepare(`SELECT COUNT(*) AS totalCount FROM slack_users su WHERE ${where}`)
        .get(workspaceId, ...searchParameters) as { totalCount: number };
      const rows = db
        .prepare(
          `
          SELECT
            su.slackUserId,
            su.legacyName,
            su.displayName,
            su.realName,
            su.email,
            su.isDeleted,
            sm.userName,
            sm.generation AS mappingGeneration,
            sm.updatedAt AS mappingUpdatedAt,
            sm.welcomeStatus,
            sm.welcomeLastError
          FROM slack_users su
          LEFT JOIN slack_user_mappings sm
            ON sm.workspaceId = su.workspaceId AND sm.slackUserId = su.slackUserId
          WHERE ${where}
          ORDER BY su.isDeleted, COALESCE(NULLIF(su.displayName, ''), NULLIF(su.realName, ''), su.legacyName, su.slackUserId), su.slackUserId
          LIMIT ? OFFSET ?
        `
        )
        .all(workspaceId, ...searchParameters, pageSize, (page - 1) * pageSize) as unknown as SlackUserRow[];
      return {
        users: rows.map(mapUser),
        totalCount,
        page,
        pageSize,
        mappingRevision: configuration.mappingRevision
      };
    });
  }
}

function mapUser(row: SlackUserRow): SlackUserDto {
  return {
    slackUserId: row.slackUserId,
    legacyName: row.legacyName,
    displayName: row.displayName,
    realName: row.realName,
    email: row.email,
    isDeleted: row.isDeleted === 1,
    userName: row.userName,
    mappingGeneration: row.mappingGeneration,
    mappingUpdatedAt: row.mappingUpdatedAt,
    welcomeStatus: row.welcomeStatus === null ? null : mapWelcomeStatus(row.welcomeStatus),
    welcomeLastError: row.welcomeLastError
  };
}

function mapWelcomeStatus(status: SlackMappingWelcomeStatus): SlackWelcomeStatus {
  switch (status) {
    case SlackMappingWelcomeStatus.SENT: {
      return SlackWelcomeStatus.SENT;
    }
    case SlackMappingWelcomeStatus.FAILED: {
      return SlackWelcomeStatus.FAILED;
    }
    default: {
      return SlackWelcomeStatus.PENDING;
    }
  }
}
