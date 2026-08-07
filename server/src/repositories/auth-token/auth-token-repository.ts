import { Repository } from '../repository';
import { AuthToken } from './auth-token';

export interface AuthTokenRepository extends Repository {
  insert(abortSignal: AbortSignal, authToken: AuthToken): Promise<void>;
  tryGetByToken(abortSignal: AbortSignal, token: string): Promise<AuthToken | null>;
  delete(abortSignal: AbortSignal, token: string): Promise<void>;
  deleteOutdated(abortSignal: AbortSignal, now: number): Promise<void>;
}
