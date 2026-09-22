import type { GetSlackUsersRequest, GetSlackUsersResponse, SaveSlackMappingsRequest, SaveSlackMappingsResponse } from '@ailaflow/shared';
import { EventBus } from '../events/event-bus';
import { SlackMappingsChangedEvent } from '../events/slack-configuration/slack-mappings-changed-event';
import { SlackUserListQuerier } from '../queriers/slack-user-list/slack-user-list-querier';
import { SlackConfigurationRepository } from '../repositories/configuration/slack/slack-configuration-repository';
import { SlackUserDirectoryRepository } from '../repositories/configuration/slack/slack-user-directory-repository';
import {
  SlackMappingRevisionConflictError,
  SlackMappingValidationError,
  SlackUserMappingRepository
} from '../repositories/configuration/slack/slack-user-mapping-repository';
import { UserRepository } from '../repositories/user/user-repository';
import { SlackError, SlackErrorReason } from './slack-error';

export class SlackMappingManager {
  public constructor(
    private readonly configurationRepository: SlackConfigurationRepository,
    private readonly directoryRepository: SlackUserDirectoryRepository,
    private readonly mappingRepository: SlackUserMappingRepository,
    private readonly userListQuerier: SlackUserListQuerier,
    private readonly userRepository: UserRepository,
    private readonly eventBus: EventBus
  ) {}

  public async list(signal: AbortSignal, request: GetSlackUsersRequest): Promise<GetSlackUsersResponse> {
    const configuration = await this.requireConfiguration(signal);
    return this.userListQuerier.query(signal, configuration.workspaceId, request.page, request.pageSize, request.search);
  }

  public async save(signal: AbortSignal, request: SaveSlackMappingsRequest): Promise<SaveSlackMappingsResponse> {
    const configuration = await this.requireConfiguration(signal);
    await this.validateChanges(signal, configuration.workspaceId, request);
    try {
      const mappingRevision = await this.mappingRepository.applyChanges(
        signal,
        configuration.workspaceId,
        request.expectedRevision,
        request.changes
      );
      await this.eventBus.publish(new SlackMappingsChangedEvent());
      return { mappingRevision };
    } catch (error) {
      if (error instanceof SlackMappingRevisionConflictError) {
        throw new SlackError(SlackErrorReason.MAPPING_REVISION_CONFLICT, error.message);
      }
      if (error instanceof SlackMappingValidationError) {
        throw new SlackError(SlackErrorReason.INVALID_MAPPING, error.message);
      }
      throw error;
    }
  }

  private async requireConfiguration(signal: AbortSignal) {
    const configuration = await this.configurationRepository.tryGet(signal);
    if (!configuration) {
      throw new SlackError(SlackErrorReason.NOT_CONFIGURED, 'Slack is not configured');
    }
    return configuration;
  }

  private async validateChanges(signal: AbortSignal, workspaceId: string, request: SaveSlackMappingsRequest): Promise<void> {
    const slackIds = new Set<string>();
    const userNames = new Set<string>();
    for (const change of request.changes) {
      if (slackIds.has(change.slackUserId)) {
        throw new SlackError(SlackErrorReason.INVALID_MAPPING, 'Each Slack member may be changed only once');
      }
      slackIds.add(change.slackUserId);
      const slackUser = await this.directoryRepository.tryGet(signal, workspaceId, change.slackUserId);
      if (!slackUser || slackUser.isBot || slackUser.isAppUser) {
        throw new SlackError(SlackErrorReason.INVALID_MAPPING, 'Slack member is not available for mapping');
      }
      if (change.userName !== null) {
        if (slackUser.isDeleted) {
          throw new SlackError(SlackErrorReason.INVALID_MAPPING, 'A deactivated Slack member cannot be mapped');
        }
        if (userNames.has(change.userName)) {
          throw new SlackError(SlackErrorReason.INVALID_MAPPING, 'An AilaFlow user can be mapped only once');
        }
        userNames.add(change.userName);
        if (!(await this.userRepository.tryGetUser(signal, change.userName))) {
          throw new SlackError(SlackErrorReason.INVALID_MAPPING, 'AilaFlow user not found');
        }
      }
    }
  }
}
