import { KvConfigurationManager } from '../../configuration/kv/kv-configuration-manager';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { EventEmitter } from 'node:events';
import test from 'node:test';
import { Request } from 'express';
import { PublicUrlTester } from '../../configuration/public-url/public-url-tester';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteKvConfigurationRepository } from '../../repositories/configuration/kv/sqlite-kv-configuration-repository';
import { GetPublicUrlConfigurationEndpoint } from './get-public-url-configuration-endpoint';
import { SavePublicUrlConfigurationEndpoint } from './save-public-url-configuration-endpoint';
import { TestPublicUrlEndpoint } from './test-public-url-endpoint';

test('gets, saves, clears, and tests the Public URL configuration', async () => {
  const db = new DatabaseSync(':memory:', { open: true });
  const repository = new SqliteKvConfigurationRepository({ modelDb: new SqliteDatabase(db) } as SqliteDatabases);
  const manager = new KvConfigurationManager(repository);
  const tester = new PublicUrlTester();
  const getEndpoint = new GetPublicUrlConfigurationEndpoint(manager);
  const saveEndpoint = new SavePublicUrlConfigurationEndpoint(manager);
  const testEndpoint = new TestPublicUrlEndpoint(manager, tester);
  const abortSignal = new AbortController().signal;
  await repository.setup(abortSignal);

  assert.deepEqual(await getEndpoint.handle(createRequest()), { publicUrl: null });
  assert.deepEqual(await testEndpoint.handle(createRequest({})), {
    publicUrl: null,
    isAvailable: false,
    error: 'Public URL is not configured.'
  });
  assert.deepEqual(await saveEndpoint.handle(createRequest({ publicUrl: 'https://ailaflow.example.com/proxy/ailaflow' })), {
    publicUrl: 'https://ailaflow.example.com/proxy/ailaflow'
  });
  assert.deepEqual(await getEndpoint.handle(createRequest()), { publicUrl: 'https://ailaflow.example.com/proxy/ailaflow' });
  for (const publicUrl of [
    ' https://ailaflow.example.com ',
    'https://ailaflow.example.com/proxy/ailaflow/',
    'https://AILAFLOW.example.com'
  ]) {
    await assert.rejects(saveEndpoint.handle(createRequest({ publicUrl })));
    await assert.rejects(testEndpoint.handle(createRequest({ publicUrl })));
  }
  assert.deepEqual(await getEndpoint.handle(createRequest()), { publicUrl: 'https://ailaflow.example.com/proxy/ailaflow' });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    assert.equal(input.toString(), 'https://ailaflow.example.com/proxy/ailaflow/health');
    return Response.json({ server: 'ailaflow', status: 'ok' });
  };
  try {
    assert.deepEqual(await testEndpoint.handle(createRequest({})), {
      publicUrl: 'https://ailaflow.example.com/proxy/ailaflow',
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
