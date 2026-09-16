import type {
  DeleteSlackConfigurationResponse,
  GetSlackConfigurationResponse,
  SaveSlackConfigurationRequest,
  SaveSlackConfigurationResponse
} from '@ailaflow/shared';
import { Transaction } from '../core/transaction';
import { EventBus } from '../events/event-bus';
import { SlackConfigurationChangedEvent } from '../events/slack-configuration/slack-configuration-changed-event';
import { SlackConfigurationRepository } from '../repositories/configuration/slack/slack-configuration-repository';
import { SlackUserDirectoryRepository } from '../repositories/configuration/slack/slack-user-directory-repository';
import { SlackUserMappingRepository } from '../repositories/configuration/slack/slack-user-mapping-repository';
import { SlackBotApiClient, SlackBotApiError } from './slack-bot-api-client';
import { SlackError, SlackErrorReason } from './slack-error';
import { SlackRuntimeHealthProvider } from './slack-runtime-health';

export class SlackConfigurationManager {
  public constructor(
    private readonly configurationRepository: SlackConfigurationRepository,
    private readonly directoryRepository: SlackUserDirectoryRepository,
    private readonly mappingRepository: SlackUserMappingRepository,
    private readonly client: SlackBotApiClient,
    private readonly runtimeHealth: SlackRuntimeHealthProvider,
    private readonly eventBus: EventBus
  ) {}

  public async get(abortSignal: AbortSignal): Promise<GetSlackConfigurationResponse> {
    const configuration = await this.configurationRepository.tryGet(abortSignal);
    const workspaceId = configuration?.workspaceId;
    const directoryCounts = workspaceId
      ? await this.directoryRepository.getCounts(abortSignal, workspaceId)
      : { active: 0, unavailable: 0, lastRefreshedAt: null };
    const mappingCounts = workspaceId ? await this.mappingRepository.getCounts(abortSignal, workspaceId) : { mapped: 0, failedWelcome: 0 };
    return {
      isConfigured: configuration !== null,
      hasAppToken: Boolean(configuration?.appToken),
      hasBotToken: Boolean(configuration?.botToken),
      appId: configuration?.appId ?? null,
      workspaceId: workspaceId ?? null,
      workspaceName: configuration?.workspaceName ?? null,
      botUserId: configuration?.botUserId ?? null,
      mappingRevision: configuration?.mappingRevision ?? 0,
      configuredAt: configuration?.configuredAt ?? null,
      updatedAt: configuration?.updatedAt ?? null,
      runtime: this.runtimeHealth.getHealth(),
      directoryLastRefreshedAt: directoryCounts.lastRefreshedAt,
      counts: {
        active: directoryCounts.active,
        mapped: mappingCounts.mapped,
        unmapped: Math.max(0, directoryCounts.active - mappingCounts.mapped),
        unavailable: directoryCounts.unavailable,
        failedWelcome: mappingCounts.failedWelcome
      }
    };
  }

  public async save(abortSignal: AbortSignal, request: SaveSlackConfigurationRequest): Promise<SaveSlackConfigurationResponse> {
    const existing = await this.configurationRepository.tryGet(abortSignal);
    const appToken = request.appToken ?? existing?.appToken;
    const botToken = request.botToken ?? existing?.botToken;
    if (!appToken || !botToken) {
      throw new SlackError(SlackErrorReason.INVALID_CONFIGURATION, 'Both Slack tokens are required for the first configuration');
    }
    try {
      const identity = await this.client.testAuth(abortSignal, botToken);
      await this.client.openSocketConnection(abortSignal, appToken);
      const tokenAppId = tryGetAppIdFromAppToken(appToken);
      if (identity.appId && tokenAppId && identity.appId !== tokenAppId) {
        throw new SlackError(SlackErrorReason.INVALID_CONFIGURATION, 'The Slack app-level token and bot token belong to different apps');
      }
      const appId = identity.appId ?? tokenAppId;
      if (!appId) {
        throw new SlackError(SlackErrorReason.INVALID_CONFIGURATION, 'Slack did not return a valid App identity');
      }
      const mappings = await this.mappingRepository.getAll(abortSignal);
      if (mappings.some(mapping => mapping.workspaceId !== identity.workspaceId)) {
        throw new SlackError(
          SlackErrorReason.INVALID_CONFIGURATION,
          'Remove mappings for the previous Slack workspace before changing credentials'
        );
      }
      const now = Date.now();
      await this.configurationRepository.save(abortSignal, {
        appToken,
        botToken,
        appId,
        workspaceId: identity.workspaceId,
        workspaceName: identity.workspaceName,
        botUserId: identity.botUserId,
        mappingRevision: existing?.mappingRevision ?? 0,
        configuredAt: existing?.configuredAt ?? now,
        updatedAt: now
      });
      await this.eventBus.publish(new SlackConfigurationChangedEvent());
      return this.get(abortSignal);
    } catch (error) {
      if (error instanceof SlackError) {
        throw error;
      }
      if (error instanceof SlackBotApiError && ['invalid_auth', 'not_authed', 'token_revoked'].includes(error.code)) {
        throw new SlackError(SlackErrorReason.CREDENTIALS_REJECTED, `Slack rejected the supplied credentials (${error.code})`);
      }
      if (error instanceof SlackBotApiError) {
        throw new SlackError(SlackErrorReason.API_UNAVAILABLE, 'Slack could not validate the supplied credentials');
      }
      throw error;
    }
  }

  public async delete(abortSignal: AbortSignal): Promise<DeleteSlackConfigurationResponse> {
    const configuration = await this.configurationRepository.tryGet(abortSignal);
    const transaction = Transaction.begin();
    try {
      if (configuration) {
        await this.mappingRepository.deleteAll(abortSignal, configuration.workspaceId, transaction);
      }
      await this.configurationRepository.delete(abortSignal, transaction);
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    await this.eventBus.publish(new SlackConfigurationChangedEvent());
    return { success: true };
  }
}

function tryGetAppIdFromAppToken(appToken: string): string | null {
  const match = /^xapp-\d+-(A[A-Z0-9]+)-/.exec(appToken);
  return match?.[1] ?? null;
}
