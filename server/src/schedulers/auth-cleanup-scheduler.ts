import { Logger } from '../core/logger';
import { AuthTokenRepository } from '../repositories/auth-token/auth-token-repository';
import { MagicLinkRepository } from '../repositories/auth-token/magic-link-repository';
import { Scheduler } from './scheduler';

export class AuthCleanupScheduler implements Scheduler {
  private readonly logger = new Logger(AuthCleanupScheduler.name);
  private iv?: ReturnType<typeof setInterval>;

  public constructor(
    private readonly authTokenRepository: AuthTokenRepository,
    private readonly magicLinkRepository: MagicLinkRepository
  ) {}

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
      const signal = AbortSignal.timeout(10_000);
      const now = Date.now();
      await Promise.all([this.authTokenRepository.deleteOutdated(signal, now), this.magicLinkRepository.deleteExpired(signal, now)]);
    } catch (e) {
      this.logger.error(`Failed to delete outdated auth records: ${(e as Error)?.message ?? e}`);
    }
  };
}
