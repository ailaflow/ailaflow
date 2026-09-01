import { Logger } from '../core/logger';
import { AuthTokenRepository } from '../repositories/auth-token/auth-token-repository';
import { Scheduler } from './scheduler';

export class AuthTokenCleanupScheduler implements Scheduler {
  private readonly logger = new Logger(AuthTokenCleanupScheduler.name);
  private iv?: ReturnType<typeof setInterval>;

  public constructor(private readonly authTokenRepository: AuthTokenRepository) {}

  public start() {
    this.iv = setInterval(this.handle, 60_000);
  }

  public stop() {
    if (this.iv) {
      clearInterval(this.iv);
    }
  }

  private handle = async () => {
    try {
      const abortSignal = AbortSignal.timeout(10_000);
      const now = Date.now();
      await this.authTokenRepository.deleteOutdated(abortSignal, now);
    } catch (e) {
      this.logger.error(`Failed to delete outdated auth tokens: ${(e as Error)?.message ?? e}`);
    }
  };
}
