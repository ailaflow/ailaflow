import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test, { TestContext } from 'node:test';
import { LicenseType } from '@ailaflow/shared';
import { SqliteDatabase, SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteKvConfigurationRepository } from '../../repositories/configuration/kv/sqlite-kv-configuration-repository';
import { KvConfigurationManager } from '../kv/kv-configuration-manager';
import { LicenseManager } from './license-manager';
import { LicenseValidator } from './license-validator';
import { SqliteUserRepository } from '../../repositories/user/sqlite-user-repository';
import { User } from '../../repositories/user/user';

const signal = new AbortController().signal;

async function fixture(t: TestContext) {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  const databases = { modelDb: new SqliteDatabase(db) } as SqliteDatabases;
  const repository = new SqliteKvConfigurationRepository(databases);
  const users = new SqliteUserRepository(databases);
  await repository.setup(signal);
  await users.setup(signal);
  const validator = new LicenseValidator();
  const validate = t.mock.method(validator, 'validate');
  const configurationManager = new KvConfigurationManager(repository);
  const manager = new LicenseManager(validator, configurationManager, users);
  return { db, repository, users, validator, validate, manager, configurationManager };
}

test('Home and Starter validate without a key and status starts unavailable', async t => {
  const { manager, repository } = await fixture(t);
  assert.equal(manager.getStatus(), null);
  await manager.validateOnBackground();
  assert.equal(manager.getStatus(), null);
  assert.equal(await manager.tryValidateAndSet(signal, LicenseType.HOME, null), null);
  assert.equal(manager.getStatus()!.validationError, null);
  assert.equal(manager.getStatus()!.proof, null);
  assert.equal((await repository.get(signal)).licenseType, LicenseType.HOME);
  await manager.validateOnBackground();
  assert.equal(manager.getStatus()!.type, LicenseType.HOME);
  assert.equal(await manager.tryValidateAndSet(signal, LicenseType.STARTER, null), null);
  assert.equal(manager.getStatus()!.type, LicenseType.STARTER);
  assert.equal(manager.getStatus()!.proof, null);
});

test('validate returns status without saving license selection or replacing cached status', async t => {
  const { manager, repository, validate } = await fixture(t);
  validate.mock.mockImplementation(async () => ({ validationError: 'License expired', proof: null }));
  const status = await manager.validate(signal, LicenseType.BUSINESS, 'missing');
  assert.equal(status.type, LicenseType.BUSINESS);
  assert.equal(status.validationError, 'License expired');
  assert.equal(status.proof, null);
  assert.ok(status.checkedAt > 0);
  assert.equal(manager.getStatus(), null);
  assert.equal((await repository.get(signal)).licenseType, null);
});

test('sends the total user count as both total and active users', async t => {
  const { manager, users, validate } = await fixture(t);
  await users.insert(signal, new User('first', 'hash', true));
  await users.insert(signal, new User('second', 'hash', false));

  await manager.validate(signal, LicenseType.HOME, null);

  assert.equal(validate.mock.calls[0].arguments[4], 2);
  assert.equal(validate.mock.calls[0].arguments[5], 2);
});

test('persists instance ID and license selection and reuses them after restart', async t => {
  const { manager, repository, users, validator, validate, db } = await fixture(t);
  await manager.tryValidateAndSet(signal, LicenseType.BUSINESS, 'valid-key');
  assert.equal((await repository.get(signal)).licenseKey, 'valid-key');
  const instanceId = (await repository.get(signal)).instanceId;
  assert.ok(instanceId);
  assert.equal(validate.mock.calls[0].arguments[1], instanceId);
  assert.equal(manager.getStatus()!.proof, 'proof');
  assert.deepEqual(
    db
      .prepare('SELECT key FROM kv_configuration ORDER BY key')
      .all()
      .map(row => row.key),
    ['instanceId', 'licenseKey', 'licenseType']
  );
  const restarted = new LicenseManager(validator, new KvConfigurationManager(repository), users);
  assert.equal(restarted.getStatus(), null);
  await restarted.validateOnBackground();
  assert.equal(validate.mock.calls[1].arguments[1], instanceId);
  assert.equal(restarted.getStatus()!.validationError, null);
  await manager.tryValidateAndSet(signal, LicenseType.HOME, null);
  assert.equal((await repository.get(signal)).licenseKey, null);
});

test('invalid, missing, and blank Business keys cannot change configuration or cached status', async t => {
  const { manager, repository } = await fixture(t);
  await manager.tryValidateAndSet(signal, LicenseType.HOME, null);
  const status = manager.getStatus();
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
  validate.mock.restore();
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
  validate.mock.mockImplementation(async () => ({ validationError: 'License expired', proof: null }));
  await manager.validateOnBackground();
  assert.equal(manager.getStatus()!.validationError, 'License expired');
  validate.mock.mockImplementation(async () => {
    throw new Error('service failed');
  });
  await manager.validateOnBackground();
  validate.mock.mockImplementation(async () => ({ validationError: null, proof: 'new-proof' }));
  await manager.validateOnBackground();
  assert.equal(manager.getStatus()!.proof, 'new-proof');
});

test('skips overlapping background checks', async t => {
  const { manager, validate } = await fixture(t);
  await manager.tryValidateAndSet(signal, LicenseType.BUSINESS, 'valid-key');
  let resolve!: (value: { validationError: string | null; proof: string | null }) => void;
  let started!: () => void;
  const checking = new Promise<void>(done => {
    started = done;
  });
  validate.mock.mockImplementation(
    () =>
      new Promise<{ validationError: string | null; proof: string | null }>(done => {
        resolve = done;
        started();
      })
  );
  const background = manager.validateOnBackground();
  await checking;
  await manager.validateOnBackground();
  assert.equal(validate.mock.callCount(), 2);
  resolve({ validationError: null, proof: 'new-proof' });
  await background;
  assert.equal(manager.getStatus()!.proof, 'new-proof');
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
  validate.mock.restore();
  await manager.validateOnBackground();
  assert.equal(manager.getStatus()!.validationError, null);
});
