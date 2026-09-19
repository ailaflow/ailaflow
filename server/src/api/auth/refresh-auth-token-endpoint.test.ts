import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { Request } from 'express';
import { AuthTokenRepository } from '../../repositories/auth-token/auth-token-repository';
import { AuthToken } from '../../repositories/auth-token/auth-token';
import { RefreshAuthTokenEndpoint } from './refresh-auth-token-endpoint';

test('schedules the old token for expiration and persists both tokens', async () => {
  const authToken = new AuthToken('old-token', 'alice', Date.now() + 60_000, false);
  const upsertedTokens: AuthToken[] = [];
  const repository = createRepository(authToken, upsertedTokens);
  const endpoint = new RefreshAuthTokenEndpoint(repository);
  const beforeRefresh = Date.now();

  const response = await endpoint.handle(createRequest(authToken.token));

  const afterRefresh = Date.now();
  assert.equal(upsertedTokens.length, 2);
  assert.equal(upsertedTokens[0].token, response.authToken);
  assert.notEqual(upsertedTokens[0].token, authToken.token);
  assert.strictEqual(upsertedTokens[1], authToken);
  assert.ok(authToken.expiresAt >= beforeRefresh + 10_000);
  assert.ok(authToken.expiresAt <= afterRefresh + 10_000);
});

function createRepository(authToken: AuthToken, upsertedTokens: AuthToken[]): AuthTokenRepository {
  return {
    setup: async () => undefined,
    upsert: async (_, token) => {
      upsertedTokens.push(token);
    },
    tryGetByToken: async (_, token) => (token === authToken.token ? authToken : null),
    deleteOutdated: async () => undefined,
    deleteForUser: async () => undefined
  };
}

function createRequest(authToken: string): Request {
  return Object.assign(new EventEmitter(), { body: { authToken } }) as unknown as Request;
}
