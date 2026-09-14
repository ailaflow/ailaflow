import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test, { TestContext } from 'node:test';
import { LicenseType } from '@ailaflow/shared';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { AsyncMutex } from '../../core/async-mutex';
import { SqliteKvConfigurationRepository } from '../../repositories/configuration/kv/sqlite-kv-configuration-repository';
import { KvConfigurationManager } from './kv-configuration-manager';

const signal = new AbortController().signal;

async function fixture(t: TestContext) {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  const repository = new SqliteKvConfigurationRepository({ modelDb: db, modelDbMutex: new AsyncMutex() } as SqliteDatabases);
  await repository.setup(signal);
  return { repository, manager: new KvConfigurationManager(repository) };
}

test('caches reads, returns independent drafts, and invalidates only after a successful update', async t => {
  const { repository, manager } = await fixture(t);
  const get = t.mock.method(repository, 'get');
  const first = await manager.get(signal);
  const second = await manager.get(signal);
  assert.equal(get.mock.callCount(), 1);
  assert.notEqual(first, second);
  first.setPublicUrl('https://ailaflow.example.com');
  assert.equal(second.publicUrl, null);
  assert.equal((await manager.get(signal)).publicUrl, null);
  await manager.update(signal, first);
  assert.equal(get.mock.callCount(), 1);
  assert.equal((await manager.get(signal)).publicUrl, 'https://ailaflow.example.com');
  assert.equal(get.mock.callCount(), 2);
  assert.deepEqual((await manager.get(signal)).getChangedKeys(), []);
});

test('merges independent drafts without overwriting unrelated fields', async t => {
  const { manager } = await fixture(t);
  const url = await manager.get(signal);
  const license = await manager.get(signal);
  url.setPublicUrl('https://ailaflow.example.com');
  license.setLicenseType(LicenseType.HOME, null);
  const updatingUrl = manager.update(signal, url);
  await Promise.all([updatingUrl, manager.update(signal, license)]);
  const result = await manager.get(signal);
  assert.equal(result.publicUrl, 'https://ailaflow.example.com');
  assert.equal(result.licenseType, LicenseType.HOME);
});

test('failed writes preserve cached values and later updates can retry', async t => {
  const { repository, manager } = await fixture(t);
  const draft = await manager.get(signal);
  draft.setPublicUrl('https://ailaflow.example.com');
  const update = t.mock.method(repository, 'updateChanged', async () => {
    throw new Error('database failed');
  });
  await assert.rejects(manager.update(signal, draft), /database failed/);
  assert.equal((await manager.get(signal)).publicUrl, null);
  update.mock.restore();
  await manager.update(signal, draft);
  assert.equal((await manager.get(signal)).publicUrl, 'https://ailaflow.example.com');
  await assert.rejects(manager.update(AbortSignal.abort(), draft));
});

test('failed initial reads can retry and unchanged drafts do not write or flush the cache', async t => {
  const { repository, manager } = await fixture(t);
  const get = t.mock.method(repository, 'get', async () => {
    throw new Error('read failed');
  });
  await assert.rejects(manager.get(signal), /read failed/);
  get.mock.restore();
  const draft = await manager.get(signal);
  const update = t.mock.method(repository, 'updateChanged');
  const cachedGet = t.mock.method(repository, 'get');
  await manager.update(signal, draft);
  await manager.get(signal);
  assert.equal(update.mock.callCount(), 0);
  assert.equal(cachedGet.mock.callCount(), 0);
});
