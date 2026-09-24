import { Repository } from '../repository';
import { MagicLink } from './magic-link';

export interface MagicLinkRepository extends Repository {
  tryInsert(signal: AbortSignal, magicLink: MagicLink): Promise<boolean>;
  consume(signal: AbortSignal, tokenHash: string, now: number): Promise<string | null>;
  deleteExpired(signal: AbortSignal, now: number): Promise<void>;
  deleteForUsers(signal: AbortSignal, userName: string): Promise<void>;
}
