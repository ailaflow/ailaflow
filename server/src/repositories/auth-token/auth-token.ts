import { randomBytes } from 'crypto';
import { promisify } from 'util';
import { sha256 } from '../../core/cipher/sha256';

const EXPIRATION_TIME = 1000 * 60 * 60 * 24;

const randomBytesAsync = promisify(randomBytes);

export class AuthToken {
  public static hashToken = sha256;

  public static async create(userName: string, isAdmin: boolean): Promise<AuthToken> {
    const buffer = await randomBytesAsync(64);
    const token = buffer.toString('base64');
    const tokenHash = AuthToken.hashToken(token);
    const expiresAt = Date.now() + EXPIRATION_TIME;
    return new AuthToken(token, tokenHash, userName, expiresAt, isAdmin);
  }

  public static async refresh(authToken: AuthToken): Promise<AuthToken> {
    return AuthToken.create(authToken.userName, authToken.isAdmin);
  }

  public constructor(
    private readonly token: string | null,
    public readonly tokenHash: string,
    public readonly userName: string,
    public expiresAt: number,
    public readonly isAdmin: boolean
  ) {}

  public getToken(): string {
    if (!this.token) {
      throw new Error('Token is not available');
    }
    return this.token;
  }

  public isExpired(): boolean {
    return Date.now() > this.expiresAt;
  }

  public tryScheduleExpiration(): boolean {
    const now = Date.now();
    const isExpired = now > this.expiresAt;
    if (isExpired) {
      return false;
    }
    this.expiresAt = Date.now() + 10 * 1000;
    return true;
  }

  public maybeOverrideTestUserName(testUserName: string | undefined): {
    userName: string;
    isTest: boolean;
  } {
    if (!testUserName) {
      return {
        isTest: false,
        userName: this.userName
      };
    }
    if (!this.isAdmin) {
      throw new Error('Only admin can override the user name');
    }
    return {
      isTest: true,
      userName: testUserName
    };
  }
}
