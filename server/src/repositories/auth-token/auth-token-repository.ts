import { Transaction } from '../../core/transaction';
import { Repository } from '../repository';
import { AuthToken } from './auth-token';

export interface AuthTokenRepository extends Repository {
  upsert(abortSignal: AbortSignal, authToken: AuthToken, transaction?: Transaction): Promise<void>;
  tryGetByToken(abortSignal: AbortSignal, token: string): Promise<AuthToken | null>;
  deleteOutdated(abortSignal: AbortSignal, now: number, transaction?: Transaction): Promise<void>;
  deleteForUser(abortSignal: AbortSignal, userName: string, transaction?: Transaction): Promise<void>;
}
