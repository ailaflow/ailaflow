import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import test, { TestContext } from 'node:test';
import { Request } from 'express';
import { LicenseType } from '@aila/model';
import { LicenseManager } from '../../configuration/license/license-manager';
import { LicenseValidator } from '../../configuration/license/license-validator';
import { KvConfigurationManager } from '../../configuration/kv/kv-configuration-manager';
import { SqliteDatabases } from '../../core/sqlite-databases';
import { SqliteKvConfigurationRepository } from '../../repositories/configuration/kv/sqlite-kv-configuration-repository';
import { EndpointError } from '../framework/endpoint-error';
import { LicenseEndpoint } from './license-status-endpoint';
import { GetLicenseConfigurationEndpoint } from './get-license-configuration-endpoint';
import { SaveLicenseConfigurationEndpoint } from './save-license-configuration-endpoint';

const signal = new AbortController().signal;
async function fixture(t: TestContext) {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  const repository = new SqliteKvConfigurationRepository({ modelDb: db } as SqliteDatabases);
  await repository.setup(signal);
  const configuration = new KvConfigurationManager(repository);
  const validator = new LicenseValidator();
  const validate = t.mock.method(validator, 'validate');
  const manager = new LicenseManager(validator, configuration);
  return {
    repository,
    validate,
    get: new GetLicenseConfigurationEndpoint(configuration),
    save: new SaveLicenseConfigurationEndpoint(manager),
    status: new LicenseEndpoint(manager)
  };
}
function request(body?: unknown): Request {
  return Object.assign(new EventEmitter(), { body }) as unknown as Request;
}

test('returns public status separately and exposes key presence only to administrators', async t => {
  const f = await fixture(t);
  assert.equal('auth' in f.status, false);
  assert.equal(f.get.admin, true);
  assert.equal(f.save.admin, true);
  assert.deepEqual(await f.status.handle(), { status: null });
  await assert.rejects(f.get.handle(request()), { name: 'Error', message: 'License type is not set' });
  assert.deepEqual(await f.save.handle(request({ type: LicenseType.PRO, licenseKey: 'valid-secret' })), {});
  assert.deepEqual(await f.get.handle(request()), { type: LicenseType.PRO, hasLicenseKey: true });
  const status = await f.status.handle();
  assert.equal(status.status!.isValid, true);
  assert.equal(status.status!.type, LicenseType.PRO);
  assert.equal(JSON.stringify(status).includes('valid-secret'), false);
  assert.equal(JSON.stringify(await f.get.handle(request())).includes('valid-secret'), false);
  assert.equal(f.validate.mock.callCount(), 1);
  await f.save.handle(request({ type: LicenseType.HOME, licenseKey: null }));
  assert.deepEqual(await f.get.handle(request()), { type: LicenseType.HOME, hasLicenseKey: false });
  assert.equal((await f.repository.get(signal)).licenseKey, null);
});

test('validation rejection and service failure preserve stored selection and status', async t => {
  const f = await fixture(t);
  await f.save.handle(request({ type: LicenseType.HOME, licenseKey: null }));
  const savedStatus = await f.status.handle();
  for (const licenseKey of [null, '', '   ', 'missing']) {
    await assert.rejects(
      f.save.handle(request({ type: LicenseType.PRO, licenseKey })),
      (error: unknown) => error instanceof EndpointError && error.status === 400
    );
  }
  f.validate.mock.mockImplementation(async () => {
    throw new Error('License service unavailable');
  });
  await assert.rejects(f.save.handle(request({ type: LicenseType.PRO, licenseKey: 'valid-secret' })), /License service unavailable/);
  assert.deepEqual(await f.get.handle(request()), { type: LicenseType.HOME, hasLicenseKey: false });
  assert.deepEqual(await f.status.handle(), savedStatus);
});
