import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test, { TestContext } from 'node:test';
import { LicenseType } from '@ailaflow/shared';
import { SqliteDatabases } from '../../../core/sqlite-databases';
import { SqliteKvConfigurationRepository } from './sqlite-kv-configuration-repository';

const signal = new AbortController().signal;

async function fixture(t: TestContext) {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  const repository = new SqliteKvConfigurationRepository({ modelDb: db } as SqliteDatabases);
  await repository.setup(signal);
  return { db, repository };
}

test('updates only changed fields so independent stale snapshots do not overwrite each other', async t => {
  const { repository, db } = await fixture(t);
  const url = await repository.get(signal);
  const license = await repository.get(signal);
  const instance = await repository.get(signal);
  assert.equal(url.publicUrl, null);
  assert.equal(instance.instanceId, null);
  instance.setInstanceId('instance-id');
  url.setPublicUrl('https://ailaflow.example.com');
  license.setLicenseType(LicenseType.BUSINESS, 'secret');
  await repository.updateChanged(signal, url);
  await repository.updateChanged(signal, license);
  await repository.updateChanged(signal, instance);
  const restored = await new SqliteKvConfigurationRepository({ modelDb: db } as SqliteDatabases).get(signal);
  assert.equal(restored.publicUrl, 'https://ailaflow.example.com');
  assert.equal(restored.instanceId, 'instance-id');
  assert.equal(restored.licenseType, LicenseType.BUSINESS);
  assert.equal(restored.licenseKey, 'secret');
  assert.deepEqual(restored.getChangedKeys(), []);
  restored.setPublicUrl(null);
  restored.setInstanceId(null);
  restored.setLicenseType(LicenseType.HOME, null);
  await repository.updateChanged(signal, restored);
  const cleared = await repository.get(signal);
  assert.equal(cleared.publicUrl, null);
  assert.equal(cleared.instanceId, null);
  assert.equal(cleared.licenseKey, null);
  assert.equal(cleared.licenseType, LicenseType.HOME);
  assert.deepEqual(
    db
      .prepare('SELECT key FROM kv_configuration')
      .all()
      .map(row => row.key),
    ['licenseType']
  );
});

test('does not touch unchanged fields and rolls back all changes on failure', async t => {
  const { repository, db } = await fixture(t);
  const initial = await repository.get(signal);
  initial.setPublicUrl('https://ailaflow.example.com');
  await repository.updateChanged(signal, initial);
  db.exec(`CREATE TRIGGER reject_public_url BEFORE UPDATE ON kv_configuration WHEN NEW.key = 'publicUrl'
    BEGIN SELECT RAISE(ABORT, 'URL write rejected'); END`);
  const license = await repository.get(signal);
  await repository.updateChanged(signal, license);
  license.setLicenseType(LicenseType.BUSINESS, 'key');
  await repository.updateChanged(signal, license);
  db.exec(`CREATE TRIGGER reject_key BEFORE UPDATE ON kv_configuration WHEN NEW.key = 'licenseKey'
    BEGIN SELECT RAISE(ABORT, 'Key write rejected'); END`);
  const update = await repository.get(signal);
  update.setLicenseType(LicenseType.HOME, 'replacement');
  await assert.rejects(repository.updateChanged(signal, update), /Key write rejected/);
  const after = await repository.get(signal);
  assert.equal(after.licenseKey, 'key');
  assert.equal(after.licenseType, LicenseType.BUSINESS);
  await assert.rejects(repository.updateChanged(AbortSignal.abort(), update));
});
