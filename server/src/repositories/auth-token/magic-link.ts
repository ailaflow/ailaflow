import { createHash, randomBytes } from 'node:crypto';

export const MAGIC_LINK_VALIDITY_HOURS = 2;

export class MagicLink {
  public static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('base64url');
  }

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
