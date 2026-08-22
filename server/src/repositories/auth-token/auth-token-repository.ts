import { Repository } from '../repository';
import { AuthToken } from './auth-token';

export interface AuthTokenRepository extends Repository {
  upsert(abortSignal: AbortSignal, authToken: AuthToken): Promise<void>;
  tryGetByToken(abortSignal: AbortSignal, token: string): Promise<AuthToken | null>;
  deleteOutdated(abortSignal: AbortSignal, now: number): Promise<void>;
}
