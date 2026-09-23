import { Repository } from '../repository';
import { MagicLink } from './magic-link';

export interface MagicLinkRepository extends Repository {
  insert(signal: AbortSignal, magicLink: MagicLink): Promise<void>;
  consume(signal: AbortSignal, token: string, now: number): Promise<string | null>;
  deleteExpired(signal: AbortSignal, now: number): Promise<void>;
  deleteForUsers(signal: AbortSignal, userName: string): Promise<void>;
}
