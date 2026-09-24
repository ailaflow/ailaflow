import { randomBytes } from 'node:crypto';
import { sha256 } from '../../core/cipher/sha256';

export const MAGIC_LINK_VALIDITY_HOURS = 2;

export class MagicLink {
  public static hashToken = sha256;

  public static create(userName: string): MagicLink {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = MagicLink.hashToken(token);

    const expiresAt = Date.now() + MAGIC_LINK_VALIDITY_HOURS * 60 * 60 * 1_000;
    return new MagicLink(token, tokenHash, userName, expiresAt);
  }

  public constructor(
    /**
     * Token is not stored in the database.
     */
    public readonly token: string,
    public readonly tokenHash: string,
    public readonly userName: string,
    public readonly expiresAt: number
  ) {}
}
