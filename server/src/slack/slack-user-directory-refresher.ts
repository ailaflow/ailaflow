import type { RefreshSlackUsersResponse } from '@ailaflow/shared';
import { EventBus } from '../events/event-bus';
import { SlackMappingsChangedEvent } from '../events/slack-configuration/slack-mappings-changed-event';
import { SlackConfigurationRepository } from '../repositories/configuration/slack/slack-configuration-repository';
import { SlackUserDirectoryRepository } from '../repositories/configuration/slack/slack-user-directory-repository';
import { SlackDirectoryUser } from '../repositories/configuration/slack/slack-types';
import { SlackApiUser, SlackBotApiClient, SlackBotApiError } from './slack-bot-api-client';
import { SlackError, SlackErrorReason } from './slack-error';

export class SlackUserDirectoryRefresher {
  private isRefreshing = false;

  public constructor(
    private readonly configurationRepository: SlackConfigurationRepository,
    private readonly directoryRepository: SlackUserDirectoryRepository,
    private readonly client: SlackBotApiClient,
    private readonly eventBus: EventBus
  ) {}

  public async refresh(signal: AbortSignal): Promise<RefreshSlackUsersResponse> {
    if (this.isRefreshing) {
      throw new SlackError(SlackErrorReason.DIRECTORY_REFRESH_IN_PROGRESS, 'A Slack user refresh is already running');
    }
    this.isRefreshing = true;
    try {
      const configuration = await this.configurationRepository.tryGet(signal);
      if (!configuration) {
        throw new SlackError(SlackErrorReason.NOT_CONFIGURED, 'Slack is not configured');
      }
      const refreshedAt = Date.now();
      const members = await this.client.listUsers(signal, configuration.botToken);
      const users = members.map(member => mapUser(configuration.workspaceId, member, refreshedAt));
      await this.directoryRepository.replaceFromRefresh(signal, configuration.workspaceId, users, refreshedAt);
      await this.eventBus.publish(new SlackMappingsChangedEvent());
      const counts = await this.directoryRepository.getCounts(signal, configuration.workspaceId);
      return { refreshedAt, activeCount: counts.active, unavailableCount: counts.unavailable };
    } catch (error) {
      if (error instanceof SlackError) {
        throw error;
      }
      if (error instanceof SlackBotApiError) {
        throw new SlackError(SlackErrorReason.API_UNAVAILABLE, 'Slack could not refresh the user directory');
      }
      throw error;
    } finally {
      this.isRefreshing = false;
    }
  }
}

function mapUser(workspaceId: string, member: SlackApiUser, now: number): SlackDirectoryUser {
  return {
    workspaceId,
    slackUserId: member.id,
    legacyName: member.name?.trim() || null,
    displayName: member.profile?.display_name?.trim() || null,
    realName: member.profile?.real_name?.trim() || member.real_name?.trim() || null,
    email: member.profile?.email?.trim() || null,
    isDeleted: member.deleted === true,
    isBot: member.is_bot === true,
    isAppUser: member.is_app_user === true,
    lastSeenAt: now,
    updatedAt: now
  };
}
