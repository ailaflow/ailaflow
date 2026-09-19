import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthTokenRepository } from '../repositories/auth-token/auth-token-repository';
import { AuthToken } from '../repositories/auth-token/auth-token';
import { MagicLinkRepository } from '../repositories/auth-token/magic-link-repository';
import { UserRepository } from '../repositories/user/user-repository';
import { User } from '../repositories/user/user';
import { MagicLinkExchanger } from './magic-link-exchanger';

test('consumes a magic link and persists a non-admin auth token', async () => {
  const persisted: AuthToken[] = [];
  let consumed = false;
  const magicLinks: MagicLinkRepository = {
    setup: async () => {},
    insert: async () => {},
    consume: async (_, token) => {
      if (token !== 'valid-token' || consumed) {
        return null;
      }
      consumed = true;
      return 'alice';
    },
    deleteExpired: async () => {}
  };
  const users = {
    tryGetUser: async () => new User('alice', 'hash', true, true)
  } as unknown as UserRepository;
  const authTokens = {
    upsert: async (_signal: AbortSignal, authToken: AuthToken) => {
      persisted.push(authToken);
    }
  } as unknown as AuthTokenRepository;
  const exchanger = new MagicLinkExchanger(magicLinks, users, authTokens);
  const abortSignal = new AbortController().signal;

  const authToken = await exchanger.exchange(abortSignal, 'valid-token');

  assert.ok(authToken);
  assert.equal(authToken.userName, 'alice');
  assert.equal(authToken.isAdmin, false);
  assert.strictEqual(persisted[0], authToken);
  assert.equal(await exchanger.exchange(abortSignal, 'valid-token'), null);
});
