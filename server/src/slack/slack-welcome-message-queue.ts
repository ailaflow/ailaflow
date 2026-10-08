import { Logger } from '../core/logger';
import { SlackConfigurationRepository } from '../repositories/configuration/slack/slack-configuration-repository';
import { SlackUserMappingRepository } from '../repositories/configuration/slack/slack-user-mapping-repository';
import { SlackUserMapping } from '../repositories/configuration/slack/slack-types';
import { SlackBotApiClient, SlackBotApiError } from './slack-bot-api-client';
import { formatSlackError } from './slack-error';

export const SLACK_WELCOME_MESSAGE =
  'Hi, I’m Aila! This private conversation is your direct channel to me. Message me anytime you need help.';

export class SlackWelcomeMessageQueue {
  private readonly logger = new Logger(SlackWelcomeMessageQueue.name);
  private readonly abortController = new AbortController();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private runPromise: Promise<void> | null = null;

  public constructor(
    private readonly configurationRepository: SlackConfigurationRepository,
    private readonly mappingRepository: SlackUserMappingRepository,
    private readonly client: SlackBotApiClient
  ) {}

  public start(): void {
    this.schedule(0);
  }

  public wake(): void {
    this.schedule(0);
  }

  public async stop(): Promise<void> {
    this.abortController.abort();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.runPromise;
  }

  private schedule(delayMs: number): void {
    if (this.abortController.signal.aborted || this.running) {
      return;
    }
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      const promise = this.run();
      this.runPromise = promise;
      void promise.finally(() => {
        if (this.runPromise === promise) {
          this.runPromise = null;
        }
      });
    }, delayMs);
  }

  private async run(): Promise<void> {
    if (this.abortController.signal.aborted || this.running) {
      return;
    }
    this.timer = null;
    this.running = true;
    try {
      const configuration = await this.configurationRepository.tryGet(this.abortController.signal);
      if (configuration) {
        const mappings = await this.mappingRepository.getWelcomeCandidates(this.abortController.signal, Date.now());
        for (const mapping of mappings) {
          if (mapping.workspaceId === configuration.workspaceId) {
            await this.deliver(configuration.botToken, mapping);
          }
        }
      }
    } catch (error) {
      if (!this.abortController.signal.aborted) {
        this.logger.error(`Slack welcome queue failed: ${formatSlackError(error)}`);
      }
    } finally {
      this.running = false;
      this.schedule(5_000);
    }
  }

  private async deliver(botToken: string, mapping: SlackUserMapping): Promise<void> {
    try {
      const sent = await this.client.postMessage(this.abortController.signal, botToken, mapping.slackUserId, {
        text: SLACK_WELCOME_MESSAGE
      });
      await this.mappingRepository.markWelcomeSent(this.abortController.signal, mapping, sent.channel, Date.now());
    } catch (error) {
      const message = formatSlackError(error);
      if (isPermanent(error)) {
        await this.mappingRepository.markWelcomeFailed(this.abortController.signal, mapping, message);
        return;
      }
      const retryAfter = error instanceof SlackBotApiError ? error.retryAfterSeconds : null;
      const backoff = Math.min(300_000, 2_000 * 2 ** Math.min(mapping.welcomeAttemptCount, 7));
      await this.mappingRepository.markWelcomeAttempt(
        this.abortController.signal,
        mapping,
        Date.now() + (retryAfter !== null ? retryAfter * 1_000 : backoff),
        message
      );
    }
  }
}

function isPermanent(error: unknown): boolean {
  return (
    error instanceof SlackBotApiError &&
    ['channel_not_found', 'account_inactive', 'invalid_auth', 'not_authed', 'token_revoked', 'missing_scope'].includes(error.code)
  );
}
