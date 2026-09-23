import { AuthTokenRepository } from '../repositories/auth-token/auth-token-repository';
import { AuthToken } from '../repositories/auth-token/auth-token';
import { MagicLinkRepository } from '../repositories/auth-token/magic-link-repository';
import { UserRepository } from '../repositories/user/user-repository';
import { MagicLink } from '../repositories/auth-token/magic-link';

export class MagicLinkExchanger {
  public constructor(
    private readonly magicLinkRepository: MagicLinkRepository,
    private readonly userRepository: UserRepository,
    private readonly authTokenRepository: AuthTokenRepository
  ) {}

  public async exchange(signal: AbortSignal, token: string): Promise<AuthToken | null> {
    const tokenHash = MagicLink.hashToken(token);
    const userName = await this.magicLinkRepository.consume(signal, tokenHash, Date.now());
    if (!userName) {
      return null;
    }

    const user = await this.userRepository.tryGetUser(signal, userName);
    if (!user) {
      return null;
    }

    // Magic links must never grant admin privileges.
    const authToken = await AuthToken.create(user.name, false);
    await this.authTokenRepository.upsert(signal, authToken);
    return authToken;
  }
}
