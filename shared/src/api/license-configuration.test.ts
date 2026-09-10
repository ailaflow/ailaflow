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
    { type: 1, licenseKey: null },
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

test('configuration exposes only key presence while status and proof can be null', () => {
  assert.deepEqual(getLicenseConfigurationResponseSchema.parse({ type: LicenseType.BUSINESS, hasLicenseKey: true }), {
    type: LicenseType.BUSINESS,
    hasLicenseKey: true
  });
  assert.deepEqual(getLicenseStatusResponseSchema.parse({ status: null }), { status: null });
  const status = { type: LicenseType.HOME, isValid: true, proof: null, checkedAt: 123 };
  assert.deepEqual(getLicenseStatusResponseSchema.parse({ status }), { status });
});
