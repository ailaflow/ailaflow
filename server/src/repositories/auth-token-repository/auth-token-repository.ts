import { randomBytes } from 'crypto';
import { Repository } from '../repository';
import { promisify } from 'util';

const EXPIRATION_TIME = 1000 * 60 * 60 * 24;

const randomBytesAsync = promisify(randomBytes);

export class AuthToken {
  public static async create(userName: string): Promise<AuthToken> {
    const buffer = await randomBytesAsync(64);
    const token = buffer.toString('hex');
    const expiresAt = Date.now() + EXPIRATION_TIME;
    return new AuthToken(token, userName, expiresAt);
  }

  public constructor(
    public readonly token: string,
    public readonly userName: string,
    public readonly expiresAt: number
  ) {}

  public isExpired(): boolean {
    return Date.now() > this.expiresAt;
  }
}

export interface AuthTokenRepository extends Repository {
  insert(authToken: AuthToken): Promise<void>;
  tryGetByToken(token: string): Promise<AuthToken | null>;
  delete(token: string): Promise<void>;
}
