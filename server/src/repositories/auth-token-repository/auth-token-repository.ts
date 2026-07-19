import { randomBytes } from 'crypto';
import { Repository } from '../repository';
import { promisify } from 'util';

const EXPIRATION_TIME = 1000 * 60 * 60 * 24;

const randomBytesAsync = promisify(randomBytes);

export class AuthToken {
  public static async create(userName: string, isAdmin: boolean): Promise<AuthToken> {
    const buffer = await randomBytesAsync(64);
    const token = buffer.toString('hex');
    const expiresAt = Date.now() + EXPIRATION_TIME;
    return new AuthToken(token, userName, expiresAt, isAdmin);
  }

  public static async refresh(authToken: AuthToken): Promise<AuthToken> {
    return AuthToken.create(authToken.userName, authToken.isAdmin);
  }

  public constructor(
    public readonly token: string,
    public readonly userName: string,
    public readonly expiresAt: number,
    public readonly isAdmin: boolean
  ) {}

  public isExpired(): boolean {
    return Date.now() > this.expiresAt;
  }
}

export interface AuthTokenRepository extends Repository {
  insert(abortSignal: AbortSignal, authToken: AuthToken): Promise<void>;
  tryGetByToken(abortSignal: AbortSignal, token: string): Promise<AuthToken | null>;
  delete(abortSignal: AbortSignal, token: string): Promise<void>;
}
