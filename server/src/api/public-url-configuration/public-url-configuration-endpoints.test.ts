import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { Request } from 'express';
import { PublicUrlTester } from '../../configuration/public-url/public-url-tester';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqlitePublicUrlConfigurationRepository } from '../../repositories/configuration/public-url/sqlite-public-url-configuration-repository';
import { GetPublicUrlConfigurationEndpoint } from './get-public-url-configuration-endpoint';
import { SavePublicUrlConfigurationEndpoint } from './save-public-url-configuration-endpoint';
import { TestPublicUrlEndpoint } from './test-public-url-endpoint';

test('gets, saves, clears, and tests the Public URL configuration', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const repository = new SqlitePublicUrlConfigurationRepository({ modelDb: db } as SqliteDatabases);
  const tester = new PublicUrlTester();
  const getEndpoint = new GetPublicUrlConfigurationEndpoint(repository);
  const saveEndpoint = new SavePublicUrlConfigurationEndpoint(repository);
  const testEndpoint = new TestPublicUrlEndpoint(repository, tester);
  const abortSignal = new AbortController().signal;
  await repository.setup(abortSignal);

  assert.deepEqual(await getEndpoint.handle(createRequest()), { publicUrl: null });
  assert.deepEqual(await testEndpoint.handle(createRequest({})), {
    publicUrl: null,
    isAvailable: false,
    error: 'Public URL is not configured.'
  });
  assert.deepEqual(await saveEndpoint.handle(createRequest({ publicUrl: 'https://aila.example.com/proxy/aila/' })), {
    publicUrl: 'https://aila.example.com/proxy/aila'
  });
  assert.deepEqual(await getEndpoint.handle(createRequest()), { publicUrl: 'https://aila.example.com/proxy/aila' });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    assert.equal(input.toString(), 'https://aila.example.com/proxy/aila/health');
    return Response.json({ server: 'aila', status: 'ok' });
  };
  try {
    assert.deepEqual(await testEndpoint.handle(createRequest({})), {
      publicUrl: 'https://aila.example.com/proxy/aila',
      isAvailable: true,
      error: null
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.deepEqual(await saveEndpoint.handle(createRequest({ publicUrl: null })), { publicUrl: null });
  assert.deepEqual(await getEndpoint.handle(createRequest()), { publicUrl: null });

  assert.equal(getEndpoint.admin, true);
  assert.equal(saveEndpoint.admin, true);
  assert.equal(testEndpoint.admin, true);
  db.close();
});

function createRequest(body?: unknown): Request {
  return Object.assign(new EventEmitter(), { body }) as unknown as Request;
}
