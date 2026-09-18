import { Repository } from '../repository';
import { MagicLink } from './magic-link';

export interface MagicLinkRepository extends Repository {
  insert(abortSignal: AbortSignal, magicLink: MagicLink): Promise<void>;
  consume(abortSignal: AbortSignal, token: string, now: number): Promise<string | null>;
  deleteExpired(abortSignal: AbortSignal, now: number): Promise<void>;
}
