import { randomBytes } from 'node:crypto';

export const MAGIC_LINK_VALIDITY_HOURS = 2;

export class MagicLink {
  public static create(userName: string): MagicLink {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + MAGIC_LINK_VALIDITY_HOURS * 60 * 60 * 1_000;
    return new MagicLink(token, userName, expiresAt);
  }

  public constructor(
    public readonly token: string,
    public readonly userName: string,
    public readonly expiresAt: number
  ) {}
}
