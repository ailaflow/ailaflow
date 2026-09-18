import { AuthTokenRepository } from '../repositories/auth-token/auth-token-repository';
import { AuthToken } from '../repositories/auth-token/auth-token';
import { MagicLinkRepository } from '../repositories/auth-token/magic-link-repository';
import { UserRepository } from '../repositories/user/user-repository';

export class MagicLinkExchanger {
  public constructor(
    private readonly magicLinkRepository: MagicLinkRepository,
    private readonly userRepository: UserRepository,
    private readonly authTokenRepository: AuthTokenRepository
  ) {}

  public async exchange(abortSignal: AbortSignal, token: string): Promise<AuthToken | null> {
    const userName = await this.magicLinkRepository.consume(abortSignal, token, Date.now());
    if (!userName) {
      return null;
    }

    const user = await this.userRepository.tryGetUser(abortSignal, userName);
    if (!user) {
      return null;
    }

    // Magic links must never grant admin privileges.
    const authToken = await AuthToken.create(user.name, false);
    await this.authTokenRepository.upsert(abortSignal, authToken);
    return authToken;
  }
}
