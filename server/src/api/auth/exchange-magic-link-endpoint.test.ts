import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Request } from 'express';
import test from 'node:test';
import { MagicLinkExchanger } from '../../magic-link/magic-link-exchanger';
import { AuthTokenRepository } from '../../repositories/auth-token/auth-token-repository';
import { MagicLinkRepository } from '../../repositories/auth-token/magic-link-repository';
import { MagicLink } from '../../repositories/auth-token/magic-link';
import { UserRepository } from '../../repositories/user/user-repository';
import { User } from '../../repositories/user/user';
import { EndpointError } from '../framework/endpoint-error';
import { ExchangeMagicLinkEndpoint } from './exchange-magic-link-endpoint';

test('exchanges a valid magic link without requiring authentication', async () => {
  let consumed = false;
  const magicLinks: MagicLinkRepository = {
    setup: async () => {},
    insert: async () => {},
    consume: async (_, tokenHash) => {
      if (tokenHash !== MagicLink.hashToken('magic-token') || consumed) {
        return null;
      }
      consumed = true;
      return 'alice';
    },
    deleteExpired: async () => {},
    deleteForUsers: async () => {}
  };
  const users = {
    tryGetUser: async () => new User('alice', null, 'hash', true, true)
  } as unknown as UserRepository;
  const authTokens = {
    upsert: async () => {}
  } as unknown as AuthTokenRepository;
  const endpoint = new ExchangeMagicLinkEndpoint(new MagicLinkExchanger(magicLinks, users, authTokens));

  const response = await endpoint.handle(createRequest('magic-token'));

  assert.equal('auth' in endpoint, false);
  assert.equal(response.userName, 'alice');
  assert.equal(response.isAdmin, false);
  assert.ok(response.authToken);
  await assert.rejects(
    () => endpoint.handle(createRequest('magic-token')),
    (error: unknown) => error instanceof EndpointError && error.status === 401
  );
});

function createRequest(token: string): Request {
  return Object.assign(new EventEmitter(), { body: { token } }) as unknown as Request;
}
