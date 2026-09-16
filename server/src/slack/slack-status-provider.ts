import { SlackConnectionStatus } from '@ailaflow/shared';
import type { MySlackConfigurationResponse } from '@ailaflow/shared';
import { SlackConfigurationRepository } from '../repositories/configuration/slack/slack-configuration-repository';
import { SlackUserDirectoryRepository } from '../repositories/configuration/slack/slack-user-directory-repository';
import { SlackUserMappingRepository } from '../repositories/configuration/slack/slack-user-mapping-repository';
import { SlackRuntimeHealthProvider } from './slack-runtime-health';

export class SlackStatusProvider {
  public constructor(
    private readonly configurationRepository: SlackConfigurationRepository,
    private readonly directoryRepository: SlackUserDirectoryRepository,
    private readonly mappingRepository: SlackUserMappingRepository,
    private readonly runtimeHealth: SlackRuntimeHealthProvider
  ) {}

  public async get(abortSignal: AbortSignal, userName: string): Promise<MySlackConfigurationResponse> {
    const mapping = await this.mappingRepository.tryGetByAilaUser(abortSignal, userName, 'default');
    if (!mapping) {
      return { status: SlackConnectionStatus.NOT_CONNECTED, workspaceName: null, displayName: null, email: null };
    }
    const configuration = await this.configurationRepository.tryGet(abortSignal);
    const slackUser = await this.directoryRepository.tryGet(abortSignal, mapping.workspaceId, mapping.slackUserId);
    const available =
      configuration?.workspaceId === mapping.workspaceId &&
      slackUser !== null &&
      !slackUser.isDeleted &&
      this.runtimeHealth.getHealth().isOperational;
    return {
      status: available ? SlackConnectionStatus.CONNECTED : SlackConnectionStatus.UNAVAILABLE,
      workspaceName: configuration?.workspaceId === mapping.workspaceId ? configuration.workspaceName : null,
      displayName: slackUser?.displayName || slackUser?.realName || slackUser?.legacyName || null,
      email: slackUser?.email ?? null
    };
  }
}
