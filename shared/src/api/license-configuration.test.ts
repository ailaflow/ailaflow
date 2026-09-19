import assert from 'node:assert/strict';
import test from 'node:test';
import { LicenseType } from '../configuration/license';
import { installRequestSchema } from './install';
import {
  getLicenseConfigurationResponseSchema,
  getLicenseStatusResponseSchema,
  saveLicenseConfigurationRequestSchema
} from './license-configuration';

test('uses numeric license types with flat license fields during installation', () => {
  const install = { rootUserName: 'root', rootPassword: 'password' };
  assert.equal(installRequestSchema.safeParse(install).success, false);
  for (const license of [
    {},
    { type: 'home', licenseKey: null },
    { type: 'business', licenseKey: 'key' },
    { type: 999, licenseKey: null },
    { type: LicenseType.BUSINESS }
  ]) {
    assert.equal(installRequestSchema.safeParse({ ...install, licenseType: license.type, licenseKey: license.licenseKey }).success, false);
    assert.equal(saveLicenseConfigurationRequestSchema.safeParse(license).success, false);
  }
  for (const license of [
    { type: LicenseType.HOME, licenseKey: null },
    { type: LicenseType.STARTER, licenseKey: null },
    { type: LicenseType.BUSINESS, licenseKey: 'key' }
  ]) {
    const request = { ...install, licenseType: license.type, licenseKey: license.licenseKey };
    assert.deepEqual(installRequestSchema.parse(request), request);
    assert.equal(installRequestSchema.safeParse({ ...install, license }).success, false);
    assert.deepEqual(saveLicenseConfigurationRequestSchema.parse(license), license);
  }
});

test('configuration exposes only key presence while status includes instance and upgrade information', () => {
  assert.deepEqual(getLicenseConfigurationResponseSchema.parse({ type: LicenseType.BUSINESS, hasLicenseKey: true }), {
    type: LicenseType.BUSINESS,
    hasLicenseKey: true
  });
  const baseStatus = { instanceId: 'instance-id', version: '1.2.3' };
  assert.deepEqual(getLicenseStatusResponseSchema.parse(baseStatus), baseStatus);
  const status = { ...baseStatus, type: LicenseType.HOME, validationError: null, checkedAt: 123, canUpgrade: true };
  assert.deepEqual(getLicenseStatusResponseSchema.parse(status), status);
  assert.equal(getLicenseStatusResponseSchema.safeParse({ ...status, validationError: 'License expired' }).success, true);
  assert.equal(
    getLicenseStatusResponseSchema.safeParse({ version: '1.2.3' }).success,
    false
  );
  assert.equal(
    getLicenseStatusResponseSchema.safeParse({ instanceId: 'instance-id' }).success,
    false
  );
  assert.equal(
    getLicenseStatusResponseSchema.safeParse({ ...status, canUpgrade: 'yes' }).success,
    false
  );
});
