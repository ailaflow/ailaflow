import { KvConfigurationManager } from '../../configuration/kv/kv-configuration-manager';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test, { TestContext } from 'node:test';
import { Request } from 'express';
import { LicenseType } from '@ailaflow/shared';
import { LicenseManager } from '../../configuration/license/license-manager';
import { LicenseValidator } from '../../configuration/license/license-validator';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteKvConfigurationRepository } from '../../repositories/configuration/kv/sqlite-kv-configuration-repository';
import { SqliteSandboxRepository } from '../../repositories/sandbox/sqlite-sandbox-repository';
import { SqliteUserAttributesRepository } from '../../repositories/user-attributes/sqlite-user-attributes-repository';
import { SqliteUserRepository } from '../../repositories/user/sqlite-user-repository';
import { InstallEndpoint } from './install-endpoint';
import { Installer } from '../../install/installer';
import { CanInstallEndpoint } from './can-install-endpoint';
import { FileSystemCipherKeyStore } from '../../core/cipher/file-system-cipher-key-store';
import { Cipher } from '../../core/cipher/cipher';
import { VersionProvider } from '../../core/version-provider';

const signal = new AbortController().signal;
const home = { licenseType: LicenseType.HOME, licenseKey: null } as const;
const starter = { licenseType: LicenseType.STARTER, licenseKey: null } as const;
const business = { licenseType: LicenseType.BUSINESS, licenseKey: 'accepted-key' } as const;

async function fixture(t: TestContext) {
  const folderPath = await mkdtemp(join(tmpdir(), 'aila-installer-'));
  t.after(() => rm(folderPath, { recursive: true, force: true }));
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  t.after(() => db.close());
  const dbs = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const cipherKeyStore = new FileSystemCipherKeyStore({ getAppDataFolderPath: () => folderPath });
  const cipher = new Cipher(cipherKeyStore);
  const users = new SqliteUserRepository(dbs);
  const attributes = new SqliteUserAttributesRepository(dbs);
  const sandboxes = new SqliteSandboxRepository(dbs, cipher);
  const configuration = new SqliteKvConfigurationRepository(dbs);
  for (const repository of [users, attributes, sandboxes, configuration]) await repository.setup(signal);
  const validator = new LicenseValidator();
  const validate = t.mock.method(validator, 'validate');
  validate.mock.mockImplementation(async (_signal, _instanceId, type, key) => ({
    validationError: type !== LicenseType.BUSINESS || key === 'accepted-key' ? null : 'Invalid license key',
    proof: type === LicenseType.BUSINESS ? 'proof' : null
  }));
  const versionProvider = { get: () => 'test-version' } as VersionProvider;
  const manager = new LicenseManager(validator, new KvConfigurationManager(configuration), users, versionProvider);
  const installer = new Installer(cipherKeyStore, cipher, users, attributes, sandboxes, manager);
  const endpoint = new InstallEndpoint(installer);
  const canInstallEndpoint = new CanInstallEndpoint(installer);
  return { db, users, attributes, sandboxes, configuration, manager, endpoint, canInstallEndpoint, validate };
}

function request(license: object | undefined): Request {
  return Object.assign(new EventEmitter(), { body: { rootUserName: 'root', rootPassword: 'password', ...license } }) as unknown as Request;
}

for (const license of [home, starter, business]) {
  test(`installs ${license.licenseType} and saves license status with initial application data`, async t => {
    const f = await fixture(t);
    assert.deepEqual(await f.canInstallEndpoint.handle(request(undefined)), { canInstall: true });
    assert.deepEqual(await f.endpoint.handle(request(license)), {});
    assert.equal(await f.users.count(signal), 1);
    assert.ok((await f.users.tryGetUser(signal, 'root'))!.isAdmin);
    assert.ok(Object.keys((await f.attributes.get(signal, 'root')).attributes).length > 0);
    assert.ok(await f.sandboxes.tryGet(signal, 'default'));
    assert.equal((await f.configuration.get(signal)).licenseType, license.licenseType);
    assert.equal((await f.configuration.get(signal)).licenseKey, license.licenseKey);
    assert.equal(f.manager.getStatus()!.validationError, null);
    assert.equal(f.validate.mock.callCount(), 1);
    assert.deepEqual(await f.canInstallEndpoint.handle(request(undefined)), { canInstall: false });
    await assert.rejects(f.endpoint.handle(request(business)), /already initialized/);
    assert.equal(f.validate.mock.callCount(), 1);
  });
}

for (const unavailable of [false, true]) {
  test(`validation ${unavailable ? 'service error' : 'rejection'} saves only the instance ID and allows retry`, async t => {
    const f = await fixture(t);
    f.validate.mock.mockImplementation(async (_signal, _instanceId, type) => {
      if (type !== LicenseType.BUSINESS) {
        return { validationError: null, proof: null };
      }
      if (unavailable) {
        throw new Error('service failed');
      }
      return { validationError: 'License expired', proof: null };
    });
    await assert.rejects(
      f.endpoint.handle(request(business)),
      unavailable ? /service failed/ : /License validation failed: License expired/
    );
    for (const table of ['users', 'user_attributes', 'user_attribute_definitions', 'sandboxes']) {
      assert.equal((f.db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count, 0);
    }
    assert.deepEqual(
      f.db
        .prepare('SELECT key FROM kv_configuration')
        .all()
        .map(row => row.key),
      ['instanceId']
    );
    const instanceId = (await f.configuration.get(signal)).instanceId;
    assert.ok(instanceId);
    assert.equal(f.manager.getStatus(), null);
    assert.deepEqual(await f.endpoint.handle(request(home)), {});
    assert.equal((await f.configuration.get(signal)).instanceId, instanceId);
  });
}

test('waits for validation before writing and rejects concurrent installation attempts', async t => {
  const f = await fixture(t);
  let resolve!: (value: { validationError: string | null; proof: string }) => void;
  let validationStartedResolve!: () => void;
  const validationStarted = new Promise<void>(done => {
    validationStartedResolve = done;
  });
  f.validate.mock.mockImplementation(
    () =>
      new Promise<{ validationError: string | null; proof: string }>(done => {
        resolve = done;
        validationStartedResolve();
      })
  );
  const installing = f.endpoint.handle(request(business));
  await validationStarted;
  assert.equal(await f.users.count(signal), 0);
  assert.equal((await f.configuration.get(signal)).licenseType, null);
  await assert.rejects(f.endpoint.handle(request(home)), /already in progress/);
  resolve({ validationError: null, proof: 'proof' });
  assert.deepEqual(await installing, {});
});

test('rejects malformed license requests without calling the service or writing', async t => {
  const f = await fixture(t);
  for (const license of [
    undefined,
    { licenseType: LicenseType.BUSINESS },
    { licenseType: 'business', licenseKey: 'key' },
    { license: { type: LicenseType.BUSINESS, licenseKey: 'key' } }
  ]) {
    await assert.rejects(f.endpoint.handle(request(license)));
  }
  assert.equal(f.validate.mock.callCount(), 0);
  assert.equal(await f.users.count(signal), 0);
});
