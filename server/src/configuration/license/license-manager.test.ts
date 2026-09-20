import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test, { TestContext } from 'node:test';
import { LicenseType } from '@ailaflow/shared';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { VersionProvider } from '../../core/version-provider';
import { SqliteKvConfigurationRepository } from '../../repositories/configuration/kv/sqlite-kv-configuration-repository';
import { KvConfigurationManager } from '../kv/kv-configuration-manager';
import { LicenseManager } from './license-manager';
import { LicenseValidator } from './license-validator';
import { SqliteUserRepository } from '../../repositories/user/sqlite-user-repository';
import { User } from '../../repositories/user/user';

const signal = new AbortController().signal;
const version = 'test-version';

const validateSuccessfully: LicenseValidator['validate'] = async () => ({ validationError: null, canUpgrade: false });

async function fixture(t: TestContext) {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  const databases = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const repository = new SqliteKvConfigurationRepository(databases);
  const users = new SqliteUserRepository(databases);
  await repository.setup(signal);
  await users.setup(signal);
  const validator = new LicenseValidator();
  const validate = t.mock.method(validator, 'validate', validateSuccessfully);
  const configurationManager = new KvConfigurationManager(repository);
  const versionProvider = { get: () => version } as VersionProvider;
  const manager = new LicenseManager(validator, configurationManager, users, versionProvider);
  return { db, repository, users, validator, validate, manager, configurationManager, versionProvider };
}

test('Home and Starter validate without a key and status starts unavailable', async t => {
  const { manager, repository } = await fixture(t);
  assert.equal(manager.getStatus(), null);
  await manager.validateOnBackground();
  assert.equal(manager.getStatus(), null);
  assert.equal(await manager.tryValidateAndSet(signal, LicenseType.HOME, null), null);
  assert.equal(manager.getStatus()!.validationResult.validationError, null);
  assert.equal(manager.getStatus()!.validationResult.canUpgrade, false);
  assert.equal((await repository.get(signal)).licenseType, LicenseType.HOME);
  await manager.validateOnBackground();
  assert.equal(manager.getStatus()!.type, LicenseType.HOME);
  assert.equal(await manager.tryValidateAndSet(signal, LicenseType.STARTER, null), null);
  assert.equal(manager.getStatus()!.type, LicenseType.STARTER);
  assert.equal(manager.getStatus()!.validationResult.canUpgrade, false);
});

test('rejected validation does not save the license selection or replace the cached status', async t => {
  const { manager, repository, validate } = await fixture(t);
  validate.mock.mockImplementation(async () => ({ validationError: 'License expired', canUpgrade: false }));
  assert.equal(await manager.tryValidateAndSet(signal, LicenseType.BUSINESS, 'missing'), 'License expired');
  assert.equal(manager.getStatus(), null);
  assert.equal((await repository.get(signal)).licenseType, null);
});

test('sends the instance, license, user counts, and version for validation', async t => {
  const { manager, users, validate } = await fixture(t);
  await users.insert(signal, new User('first', null, 'hash', true, true));
  await users.insert(signal, new User('second', null, 'hash', false, false));

  await manager.tryValidateAndSet(signal, LicenseType.HOME, null);

  assert.deepEqual(validate.mock.calls[0].arguments[1], {
    instanceId: await manager.getInstanceId(signal),
    type: LicenseType.HOME,
    key: null,
    users: 2,
    activeUsers: 1,
    version
  });
});

test('persists instance ID and license selection and reuses them after restart', async t => {
  const { manager, repository, users, validator, validate, db, versionProvider } = await fixture(t);
  await manager.tryValidateAndSet(signal, LicenseType.BUSINESS, 'valid-key');
  assert.equal((await repository.get(signal)).licenseKey, 'valid-key');
  const instanceId = (await repository.get(signal)).instanceId;
  assert.ok(instanceId);
  assert.equal(validate.mock.calls[0].arguments[1].instanceId, instanceId);
  assert.equal(manager.getStatus()!.validationResult.canUpgrade, false);
  assert.deepEqual(
    db
      .prepare('SELECT key FROM kv_configuration ORDER BY key')
      .all()
      .map(row => row.key),
    ['instanceId', 'licenseKey', 'licenseType']
  );
  const restarted = new LicenseManager(validator, new KvConfigurationManager(repository), users, versionProvider);
  assert.equal(restarted.getStatus(), null);
  await restarted.validateOnBackground();
  assert.equal(validate.mock.calls[1].arguments[1].instanceId, instanceId);
  assert.equal(restarted.getStatus()!.validationResult.validationError, null);
  await manager.tryValidateAndSet(signal, LicenseType.HOME, null);
  assert.equal((await repository.get(signal)).licenseKey, null);
});

test('invalid, missing, and blank Business keys cannot change configuration or cached status', async t => {
  const { manager, repository, validate } = await fixture(t);
  await manager.tryValidateAndSet(signal, LicenseType.HOME, null);
  const status = manager.getStatus();
  validate.mock.mockImplementation(async () => ({ validationError: 'Invalid license key', canUpgrade: false }));
  for (const key of ['missing', '', '   ', null]) {
    assert.equal(await manager.tryValidateAndSet(signal, LicenseType.BUSINESS, key), 'Invalid license key');
  }
  assert.equal((await repository.get(signal)).licenseType, LicenseType.HOME);
  assert.deepEqual(manager.getStatus(), status);
});

test('service and database failures leave saved configuration and status unchanged', async t => {
  const { manager, repository, validate } = await fixture(t);
  await manager.tryValidateAndSet(signal, LicenseType.HOME, null);
  const status = manager.getStatus();
  validate.mock.mockImplementation(async () => {
    throw new Error('service failed');
  });
  await assert.rejects(manager.tryValidateAndSet(signal, LicenseType.BUSINESS, 'valid-key'), /service failed/);
  validate.mock.mockImplementation(validateSuccessfully);
  const update = t.mock.method(repository, 'updateChanged', async () => {
    throw new Error('database failed');
  });
  await assert.rejects(manager.tryValidateAndSet(signal, LicenseType.BUSINESS, 'valid-key'), /database failed/);
  assert.deepEqual(manager.getStatus(), status);
  update.mock.restore();
  assert.equal((await repository.get(signal)).licenseType, LicenseType.HOME);
  await manager.tryValidateAndSet(signal, LicenseType.BUSINESS, 'valid-key');
  assert.equal(manager.getStatus()!.type, LicenseType.BUSINESS);
});

test('background rejection updates status and failures release the guard for later checks', async t => {
  const { manager, validate } = await fixture(t);
  await manager.tryValidateAndSet(signal, LicenseType.BUSINESS, 'valid-key');
  validate.mock.mockImplementation(async () => ({ validationError: 'License expired', canUpgrade: false }));
  await manager.validateOnBackground();
  assert.equal(manager.getStatus()!.validationResult.validationError, 'License expired');
  validate.mock.mockImplementation(async () => {
    throw new Error('service failed');
  });
  await manager.validateOnBackground();
  validate.mock.mockImplementation(async () => ({ validationError: null, canUpgrade: true }));
  await manager.validateOnBackground();
  assert.equal(manager.getStatus()!.validationResult.canUpgrade, true);
});

test('skips overlapping background checks', async t => {
  const { manager, validate } = await fixture(t);
  await manager.tryValidateAndSet(signal, LicenseType.BUSINESS, 'valid-key');
  let resolve!: (value: { validationError: string | null; canUpgrade: boolean }) => void;
  let started!: () => void;
  const checking = new Promise<void>(done => {
    started = done;
  });
  validate.mock.mockImplementation(
    () =>
      new Promise<{ validationError: string | null; canUpgrade: boolean }>(done => {
        resolve = done;
        started();
      })
  );
  const background = manager.validateOnBackground();
  await checking;
  await manager.validateOnBackground();
  assert.equal(validate.mock.callCount(), 2);
  resolve({ validationError: null, canUpgrade: true });
  await background;
  assert.equal(manager.getStatus()!.validationResult.canUpgrade, true);
});

test('stopping background validation aborts the validator and permits a subsequent check', async t => {
  const { manager, validate } = await fixture(t);
  await manager.tryValidateAndSet(signal, LicenseType.BUSINESS, 'valid-key');
  const status = manager.getStatus();
  let receivedSignal!: AbortSignal;
  let started!: () => void;
  const checking = new Promise<void>(done => {
    started = done;
  });
  validate.mock.mockImplementation(
    abortSignal =>
      new Promise((_resolve, reject) => {
        receivedSignal = abortSignal;
        abortSignal.addEventListener('abort', () => reject(abortSignal.reason), { once: true });
        started();
      })
  );
  const background = manager.validateOnBackground();
  await checking;
  manager.stopBackgroundValidation();
  await background;
  assert.equal(receivedSignal.aborted, true);
  assert.deepEqual(manager.getStatus(), status);
  validate.mock.mockImplementation(validateSuccessfully);
  await manager.validateOnBackground();
  assert.equal(manager.getStatus()!.validationResult.validationError, null);
});
