import { Transaction } from '../../core/transaction';
import { Repository } from '../repository';
import { AuthToken } from './auth-token';

export interface AuthTokenRepository extends Repository {
  upsert(signal: AbortSignal, authToken: AuthToken, transaction?: Transaction): Promise<void>;
  tryGetByToken(signal: AbortSignal, token: string): Promise<AuthToken | null>;
  deleteOutdated(signal: AbortSignal, now: number, transaction?: Transaction): Promise<void>;
  deleteForUser(signal: AbortSignal, userName: string, transaction?: Transaction): Promise<void>;
}
