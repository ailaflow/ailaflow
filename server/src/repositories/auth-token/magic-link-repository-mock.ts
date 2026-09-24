import { MagicLinkRepository } from './magic-link-repository';

export function createMagicLinkRepositoryMock(overrides: Partial<MagicLinkRepository> = {}): MagicLinkRepository {
  return {
    setup: async () => {},
    tryInsert: async () => true,
    consume: async () => null,
    deleteExpired: async () => {},
    deleteForUsers: async () => {},
    ...overrides
  };
}
